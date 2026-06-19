import prisma from "../../utils/prisma";
import {
  getConversations,
  getOrCreateConversation,
  getMessages,
  markRead,
  addReaction,
  removeReaction,
} from "../../controllers/messagesController";
import { mockRequest, mockResponse } from "../helpers";

jest.mock("../../utils/prisma");
jest.mock("../../services/notifications", () => ({
  sendNotificationToUser: jest.fn().mockResolvedValue(undefined),
  getUserPushTokens: jest.fn().mockResolvedValue([]),
}));

const db = prisma as jest.Mocked<typeof prisma>;

const STUDENT_A = {
  id: "stu-a",
  email: "a@test.com",
  role: "STUDENT" as const,
};
const STUDENT_B = {
  id: "stu-b",
  email: "b@test.com",
  role: "STUDENT" as const,
};

const makeConversation = (overrides = {}) => ({
  id: "conv-1",
  student1Id: "stu-a",
  student2Id: "stu-b",
  createdAt: new Date(),
  updatedAt: new Date(),
  student1: {
    id: "stu-a",
    username: "alice",
    name: "Alice",
    profileImageUrl: null,
  },
  student2: {
    id: "stu-b",
    username: "bob",
    name: "Bob",
    profileImageUrl: null,
  },
  messages: [],
  ...overrides,
});

const makeMessage = (overrides = {}) => ({
  id: "msg-1",
  conversationId: "conv-1",
  senderId: "stu-a",
  content: "Hello!",
  read: false,
  createdAt: new Date(),
  reactions: [],
  ...overrides,
});

// ---------------------------------------------------------------------------
// getConversations
// ---------------------------------------------------------------------------
describe("getConversations", () => {
  it("returns 401 when unauthenticated", async () => {
    const res = mockResponse();
    await getConversations(mockRequest(), res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("returns conversation list with unread counts", async () => {
    const conv = makeConversation({ messages: [makeMessage()] });
    (db.conversation.findMany as jest.Mock).mockResolvedValue([conv]);
    (db.message.groupBy as jest.Mock).mockResolvedValue([
      { conversationId: "conv-1", _count: { id: 1 } },
    ]);

    const res = mockResponse();
    await getConversations(mockRequest({ user: STUDENT_A }), res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        conversations: expect.arrayContaining([
          expect.objectContaining({ id: "conv-1", unreadCount: 1 }),
        ]),
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// getOrCreateConversation
// ---------------------------------------------------------------------------
describe("getOrCreateConversation", () => {
  it("returns 401 when unauthenticated", async () => {
    const res = mockResponse();
    await getOrCreateConversation(mockRequest(), res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("returns 400 when recipientId is missing", async () => {
    const res = mockResponse();
    await getOrCreateConversation(
      mockRequest({ user: STUDENT_A, body: {} }),
      res,
    );
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns 400 when trying to DM yourself", async () => {
    const res = mockResponse();
    await getOrCreateConversation(
      mockRequest({ user: STUDENT_A, body: { recipientId: STUDENT_A.id } }),
      res,
    );
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns 404 when recipient student does not exist", async () => {
    (db.student.findUnique as jest.Mock).mockResolvedValue(null);
    const res = mockResponse();
    await getOrCreateConversation(
      mockRequest({ user: STUDENT_A, body: { recipientId: "stu-b" } }),
      res,
    );
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("returns 403 when mutual follow does not exist", async () => {
    (db.student.findUnique as jest.Mock).mockResolvedValue({ id: "stu-b" });
    (db.follow.findFirst as jest.Mock).mockResolvedValue(null);
    const res = mockResponse();
    await getOrCreateConversation(
      mockRequest({ user: STUDENT_A, body: { recipientId: "stu-b" } }),
      res,
    );
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("creates and returns a new conversation when mutual follow exists", async () => {
    (db.student.findUnique as jest.Mock).mockResolvedValue({ id: "stu-b" });
    (db.follow.findFirst as jest.Mock)
      .mockResolvedValueOnce({ id: "f1" })
      .mockResolvedValueOnce({ id: "f2" });
    (db.conversation.findUnique as jest.Mock).mockResolvedValue(null);
    (db.conversation.create as jest.Mock).mockResolvedValue(makeConversation());

    const res = mockResponse();
    await getOrCreateConversation(
      mockRequest({ user: STUDENT_A, body: { recipientId: "stu-b" } }),
      res,
    );

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        conversation: expect.objectContaining({ id: "conv-1" }),
      }),
    );
  });

  it("returns existing conversation (200) when one already exists", async () => {
    (db.student.findUnique as jest.Mock).mockResolvedValue({ id: "stu-b" });
    (db.follow.findFirst as jest.Mock)
      .mockResolvedValueOnce({ id: "f1" })
      .mockResolvedValueOnce({ id: "f2" });
    (db.conversation.findUnique as jest.Mock).mockResolvedValue(
      makeConversation(),
    );

    const res = mockResponse();
    await getOrCreateConversation(
      mockRequest({ user: STUDENT_A, body: { recipientId: "stu-b" } }),
      res,
    );

    expect(res.status).toHaveBeenCalledWith(200);
    expect(db.conversation.create).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// getMessages
// ---------------------------------------------------------------------------
describe("getMessages", () => {
  it("returns 401 when unauthenticated", async () => {
    const res = mockResponse();
    await getMessages(mockRequest(), res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("returns 403 when student is not a participant", async () => {
    (db.conversation.findUnique as jest.Mock).mockResolvedValue({
      id: "conv-1",
      student1Id: "stu-x",
      student2Id: "stu-y",
    });
    const res = mockResponse();
    await getMessages(
      mockRequest({ user: STUDENT_A, params: { conversationId: "conv-1" } }),
      res,
    );
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("returns paginated messages for a participant", async () => {
    (db.conversation.findUnique as jest.Mock).mockResolvedValue({
      id: "conv-1",
      student1Id: "stu-a",
      student2Id: "stu-b",
    });
    (db.message.findMany as jest.Mock).mockResolvedValue([makeMessage()]);

    const res = mockResponse();
    await getMessages(
      mockRequest({
        user: STUDENT_A,
        params: { conversationId: "conv-1" },
        query: {},
      }),
      res,
    );

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: expect.arrayContaining([
          expect.objectContaining({ id: "msg-1" }),
        ]),
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// markRead
// ---------------------------------------------------------------------------
describe("markRead", () => {
  it("returns 401 when unauthenticated", async () => {
    const res = mockResponse();
    await markRead(mockRequest(), res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("returns 403 when student is not a participant", async () => {
    (db.conversation.findUnique as jest.Mock).mockResolvedValue({
      id: "conv-1",
      student1Id: "stu-x",
      student2Id: "stu-y",
    });
    const res = mockResponse();
    await markRead(
      mockRequest({ user: STUDENT_A, params: { conversationId: "conv-1" } }),
      res,
    );
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("marks all unread messages from the other student as read", async () => {
    (db.conversation.findUnique as jest.Mock).mockResolvedValue({
      id: "conv-1",
      student1Id: "stu-a",
      student2Id: "stu-b",
    });
    (db.message.updateMany as jest.Mock).mockResolvedValue({ count: 2 });

    const res = mockResponse();
    await markRead(
      mockRequest({ user: STUDENT_A, params: { conversationId: "conv-1" } }),
      res,
    );

    expect(db.message.updateMany).toHaveBeenCalledWith({
      where: {
        conversationId: "conv-1",
        senderId: { not: "stu-a" },
        read: false,
      },
      data: { read: true },
    });
    expect(res.json).toHaveBeenCalledWith({ updated: 2 });
  });
});

// ---------------------------------------------------------------------------
// addReaction
// ---------------------------------------------------------------------------
describe("addReaction", () => {
  it("returns 401 when unauthenticated", async () => {
    const res = mockResponse();
    await addReaction(mockRequest(), res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("returns 400 when emoji is missing", async () => {
    const res = mockResponse();
    await addReaction(
      mockRequest({
        user: STUDENT_A,
        params: { messageId: "msg-1" },
        body: {},
      }),
      res,
    );
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("returns 403 when student is not a conversation participant", async () => {
    (db.message.findUnique as jest.Mock).mockResolvedValue({
      id: "msg-1",
      conversation: { student1Id: "stu-x", student2Id: "stu-y" },
    });
    const res = mockResponse();
    await addReaction(
      mockRequest({
        user: STUDENT_A,
        params: { messageId: "msg-1" },
        body: { emoji: "❤️" },
      }),
      res,
    );
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("upserts the reaction and returns it", async () => {
    (db.message.findUnique as jest.Mock).mockResolvedValue({
      id: "msg-1",
      conversation: { student1Id: "stu-a", student2Id: "stu-b" },
    });
    const reaction = {
      id: "r1",
      messageId: "msg-1",
      studentId: "stu-a",
      emoji: "❤️",
      createdAt: new Date(),
    };
    (db.messageReaction.upsert as jest.Mock).mockResolvedValue(reaction);

    const res = mockResponse();
    await addReaction(
      mockRequest({
        user: STUDENT_A,
        params: { messageId: "msg-1" },
        body: { emoji: "❤️" },
      }),
      res,
    );

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ reaction }),
    );
  });
});

// ---------------------------------------------------------------------------
// removeReaction
// ---------------------------------------------------------------------------
describe("removeReaction", () => {
  it("returns 401 when unauthenticated", async () => {
    const res = mockResponse();
    await removeReaction(mockRequest(), res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("deletes the reaction and returns 204", async () => {
    (db.messageReaction.deleteMany as jest.Mock).mockResolvedValue({
      count: 1,
    });
    const res = mockResponse();
    await removeReaction(
      mockRequest({ user: STUDENT_A, params: { messageId: "msg-1" } }),
      res,
    );
    expect(db.messageReaction.deleteMany).toHaveBeenCalledWith({
      where: { messageId: "msg-1", studentId: "stu-a" },
    });
    expect(res.status).toHaveBeenCalledWith(204);
  });
});
