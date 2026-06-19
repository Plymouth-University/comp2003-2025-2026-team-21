import { Request, Response } from "express";
import prisma from "../utils/prisma";

const STUDENT_SELECT = {
  id: true,
  username: true,
  name: true,
  profileImageUrl: true,
} as const;

/** Canonical ordering ensures (A,B) and (B,A) map to the same row */
function canonicalPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

export const getConversations = async (req: Request, res: Response) => {
  try {
    const studentId = req.user?.id;
    if (!studentId) return res.status(401).json({ message: "Unauthorized" });

    const conversations = await prisma.conversation.findMany({
      where: { OR: [{ student1Id: studentId }, { student2Id: studentId }] },
      include: {
        student1: { select: STUDENT_SELECT },
        student2: { select: STUDENT_SELECT },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: { reactions: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    const conversationIds = conversations.map((c) => c.id);

    const unreadGroups = await prisma.message.groupBy({
      by: ["conversationId"],
      where: {
        conversationId: { in: conversationIds },
        senderId: { not: studentId },
        read: false,
      },
      _count: { id: true },
    });

    const unreadMap = Object.fromEntries(
      unreadGroups.map((g) => [g.conversationId, g._count.id]),
    );

    const result = conversations.map((conv) => {
      const otherStudent =
        conv.student1Id === studentId ? conv.student2 : conv.student1;
      return {
        id: conv.id,
        otherStudent,
        lastMessage: conv.messages[0] ?? null,
        unreadCount: unreadMap[conv.id] ?? 0,
        updatedAt: conv.updatedAt,
      };
    });

    return res.json({ conversations: result });
  } catch (error) {
    console.error("Error fetching conversations:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const getOrCreateConversation = async (req: Request, res: Response) => {
  try {
    const studentId = req.user?.id;
    if (!studentId) return res.status(401).json({ message: "Unauthorized" });

    const { recipientId } = req.body as { recipientId?: string };
    if (!recipientId)
      return res.status(400).json({ message: "recipientId is required" });
    if (recipientId === studentId)
      return res.status(400).json({ message: "Cannot DM yourself" });

    const recipient = await prisma.student.findUnique({
      where: { id: recipientId },
    });
    if (!recipient)
      return res.status(404).json({ message: "Student not found" });

    // Check mutual follow: current student follows recipient AND recipient follows current student
    const [aFollowsB, bFollowsA] = await Promise.all([
      prisma.follow.findFirst({
        where: { followerId: studentId, followingId: recipientId },
      }),
      prisma.follow.findFirst({
        where: { followerId: recipientId, followingId: studentId },
      }),
    ]);

    if (!aFollowsB || !bFollowsA) {
      return res
        .status(403)
        .json({ message: "Mutual follow required to start a conversation" });
    }

    const [student1Id, student2Id] = canonicalPair(studentId, recipientId);

    const CONV_INCLUDE = {
      student1: { select: STUDENT_SELECT },
      student2: { select: STUDENT_SELECT },
      messages: { orderBy: { createdAt: "desc" } as const, take: 1 },
    };

    const existing = await prisma.conversation.findUnique({
      where: { student1Id_student2Id: { student1Id, student2Id } },
      include: CONV_INCLUDE,
    });

    if (existing) {
      return res.status(200).json({ conversation: existing });
    }

    const conversation = await prisma.conversation.create({
      data: { student1Id, student2Id },
      include: CONV_INCLUDE,
    });

    return res.status(201).json({ conversation });
  } catch (error) {
    console.error("Error creating conversation:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const getMessages = async (req: Request, res: Response) => {
  try {
    const studentId = req.user?.id;
    if (!studentId) return res.status(401).json({ message: "Unauthorized" });

    const { conversationId } = req.params;
    const { cursor, limit = "30" } = req.query as {
      cursor?: string;
      limit?: string;
    };

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation)
      return res.status(404).json({ message: "Conversation not found" });

    if (
      conversation.student1Id !== studentId &&
      conversation.student2Id !== studentId
    ) {
      return res.status(403).json({ message: "Not a participant" });
    }

    const pageSize = Math.min(parseInt(limit, 10) || 30, 100);

    if (cursor && isNaN(new Date(cursor).getTime())) {
      return res.status(400).json({ message: "Invalid cursor" });
    }

    const messages = await prisma.message.findMany({
      where: {
        conversationId,
        ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
      },
      include: { reactions: true },
      orderBy: { createdAt: "desc" },
      take: pageSize,
    });

    return res.json({ messages });
  } catch (error) {
    console.error("Error fetching messages:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const markRead = async (req: Request, res: Response) => {
  try {
    const studentId = req.user?.id;
    if (!studentId) return res.status(401).json({ message: "Unauthorized" });

    const { conversationId } = req.params;

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation)
      return res.status(404).json({ message: "Conversation not found" });

    if (
      conversation.student1Id !== studentId &&
      conversation.student2Id !== studentId
    ) {
      return res.status(403).json({ message: "Not a participant" });
    }

    const { count } = await prisma.message.updateMany({
      where: { conversationId, senderId: { not: studentId }, read: false },
      data: { read: true },
    });

    return res.json({ updated: count });
  } catch (error) {
    console.error("Error marking messages read:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const addReaction = async (req: Request, res: Response) => {
  try {
    const studentId = req.user?.id;
    if (!studentId) return res.status(401).json({ message: "Unauthorized" });

    const { messageId } = req.params;
    const { emoji } = req.body as { emoji?: string };

    if (!emoji) return res.status(400).json({ message: "emoji is required" });

    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        conversation: { select: { student1Id: true, student2Id: true } },
      },
    });

    if (!message) return res.status(404).json({ message: "Message not found" });

    const { student1Id, student2Id } = message.conversation;
    if (student1Id !== studentId && student2Id !== studentId) {
      return res.status(403).json({ message: "Not a participant" });
    }

    const reaction = await prisma.messageReaction.upsert({
      where: { messageId_studentId: { messageId, studentId } },
      update: { emoji },
      create: { messageId, studentId, emoji },
    });

    return res.status(201).json({ reaction });
  } catch (error) {
    console.error("Error adding reaction:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const removeReaction = async (req: Request, res: Response) => {
  try {
    const studentId = req.user?.id;
    if (!studentId) return res.status(401).json({ message: "Unauthorized" });

    const { messageId } = req.params;

    await prisma.messageReaction.deleteMany({
      where: { messageId, studentId },
    });

    return res.status(204).send();
  } catch (error) {
    console.error("Error removing reaction:", error);
    return res.status(500).json({ message: "Server error" });
  }
};
