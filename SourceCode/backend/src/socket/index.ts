import { Server } from "socket.io";
import { Server as HttpServer } from "http";
import jwt from "jsonwebtoken";
import prisma from "../utils/prisma";
import {
  sendNotificationToUser,
  getUserPushTokens,
} from "../services/notifications";

interface JwtPayload {
  id: string;
  email: string;
  role: "STUDENT" | "ORGANISATION";
}

export let io: Server;

export function initSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: { origin: "*" },
    transports: ["websocket", "polling"],
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token as string | undefined;
    if (!token) return next(new Error("Missing token"));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
      if (decoded.role !== "STUDENT") return next(new Error("Students only"));
      socket.data.studentId = decoded.id as string;
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    const studentId = socket.data.studentId as string;
    socket.join(`room:${studentId}`);

    socket.on(
      "send_message",
      async ({
        conversationId,
        content,
      }: {
        conversationId: string;
        content: string;
      }) => {
        try {
          if (!conversationId || !content?.trim()) {
            socket.emit("error", {
              message: "conversationId and content are required",
            });
            return;
          }

          const trimmed = content.trim().slice(0, 500);

          const conversation = await prisma.conversation.findUnique({
            where: { id: conversationId },
          });

          if (!conversation) {
            socket.emit("error", { message: "Conversation not found" });
            return;
          }

          if (
            conversation.student1Id !== studentId &&
            conversation.student2Id !== studentId
          ) {
            socket.emit("error", { message: "Not a participant" });
            return;
          }

          const recipientId =
            conversation.student1Id === studentId
              ? conversation.student2Id
              : conversation.student1Id;

          const [message] = await prisma.$transaction([
            prisma.message.create({
              data: { conversationId, senderId: studentId, content: trimmed },
              include: { reactions: true },
            }),
            prisma.conversation.update({
              where: { id: conversationId },
              data: { updatedAt: new Date() },
            }),
          ]);

          // Deliver to recipient if online, otherwise push notify
          io.to(`room:${recipientId}`).emit("new_message", message);

          const recipientSockets = await io
            .in(`room:${recipientId}`)
            .fetchSockets();
          if (recipientSockets.length === 0) {
            const sender = await prisma.student.findUnique({
              where: { id: studentId },
              select: { username: true, name: true },
            });
            const senderName = sender?.name || sender?.username || "Someone";
            await sendNotificationToUser(
              recipientId,
              "STUDENT",
              "NEW_MESSAGE",
              `New message from ${senderName}`,
              trimmed.slice(0, 80),
              { conversationId },
            );
          }

          // Echo back to sender so they see their own message confirmed
          socket.emit("new_message", message);
        } catch (err) {
          console.error("send_message error:", err);
          socket.emit("error", { message: "Failed to send message" });
        }
      },
    );

    socket.on("typing", ({ conversationId }: { conversationId: string }) => {
      // Forward typing event to the other participant
      prisma.conversation
        .findUnique({ where: { id: conversationId } })
        .then((conv) => {
          if (!conv) return;
          const recipientId =
            conv.student1Id === studentId ? conv.student2Id : conv.student1Id;
          io.to(`room:${recipientId}`).emit("typing", {
            conversationId,
            studentId,
          });
        })
        .catch(() => {});
    });

    socket.on(
      "react_message",
      async ({ messageId, emoji }: { messageId: string; emoji: string }) => {
        try {
          const message = await prisma.message.findUnique({
            where: { id: messageId },
            include: {
              conversation: { select: { student1Id: true, student2Id: true } },
            },
          });

          if (!message) return;

          const { student1Id: s1, student2Id: s2 } = message.conversation;
          if (s1 !== studentId && s2 !== studentId) return;

          const reaction = await prisma.messageReaction.upsert({
            where: { messageId_studentId: { messageId, studentId } },
            update: { emoji },
            create: { messageId, studentId, emoji },
          });

          const otherStudentId = s1 === studentId ? s2 : s1;
          const payload = { messageId, reaction };
          io.to(`room:${studentId}`).emit("message_reaction", payload);
          io.to(`room:${otherStudentId}`).emit("message_reaction", payload);
        } catch (err) {
          console.error("react_message error:", err);
        }
      },
    );
  });

  return io;
}
