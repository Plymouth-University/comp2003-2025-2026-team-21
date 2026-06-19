# Direct Messages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add real-time direct messaging between students who mutually follow each other, with emoji reactions and typing indicators, powered by Socket.io layered onto the existing Express server.

**Architecture:** Socket.io is added to the existing Railway Express process using `http.createServer` — same deployment, no new services. Messages are stored in PostgreSQL (Prisma). Real-time delivery uses Socket.io private rooms (`room:<studentId>`). Offline users receive an Expo push notification. REST endpoints handle conversation creation, history, reactions, and read receipts. The frontend connects via a `useSocket` hook mounted in `Students/_layout.tsx`.

**Tech Stack:** `socket.io` (backend), `socket.io-client` (frontend), Prisma (DB), existing JWT auth, existing Expo push notification service

---

## File Map

**Backend — new files:**
- `SourceCode/backend/src/controllers/messagesController.ts` — REST handlers (conversations, messages, reactions, read receipts)
- `SourceCode/backend/src/routes/messages.ts` — Express router wiring
- `SourceCode/backend/src/socket/index.ts` — Socket.io server init, JWT auth middleware, event handlers
- `SourceCode/backend/src/__tests__/controllers/messagesController.test.ts` — unit tests
- `SourceCode/backend/prisma/migrations/20260619000000_add_direct_messages/migration.sql` — idempotent migration

**Backend — modified files:**
- `SourceCode/backend/prisma/schema.prisma` — add Conversation, Message, MessageReaction models; add relation fields to Student
- `SourceCode/backend/src/server.ts` — wrap Express with `http.createServer`, init socket, mount messages route

**Frontend — new files:**
- `SourceCode/frontend/lib/messagesApi.ts` — typed API helpers (conversations, messages, reactions, mark-read)
- `SourceCode/frontend/app/hooks/useSocket.ts` — socket connection lifecycle hook
- `SourceCode/frontend/app/Students/messages.tsx` — conversations list screen
- `SourceCode/frontend/app/Students/conversation.tsx` — chat screen (real-time messages, reactions, typing indicator)

**Frontend — modified files:**
- `SourceCode/frontend/app/components/BottomNavStudent.tsx` — add Messages tab (4th tab, chat bubble icon, unread badge)
- `SourceCode/frontend/app/Students/_layout.tsx` — register messages/conversation screens, mount useSocket, extend activeTab/routeForTab

---

## Task 1: Install dependencies

**Files:**
- Modify: `SourceCode/backend/package.json`
- Modify: `SourceCode/frontend/package.json`

- [ ] **Step 1: Install backend socket.io**

```bash
cd SourceCode/backend && npm install socket.io && npm install --save-dev @types/socket.io
```

Expected: `socket.io` appears in `package.json` dependencies. Note: `socket.io` ships its own types as of v4 so `@types/socket.io` may warn it's not found — that's fine, just `socket.io` is needed.

- [ ] **Step 2: Install frontend socket.io-client**

```bash
cd SourceCode/frontend && npm install socket.io-client
```

Expected: `socket.io-client` appears in `package.json` dependencies.

- [ ] **Step 3: Commit**

```bash
git add SourceCode/backend/package.json SourceCode/backend/package-lock.json SourceCode/frontend/package.json SourceCode/frontend/package-lock.json
git commit -m "chore: install socket.io (backend) and socket.io-client (frontend)"
```

---

## Task 2: Add Prisma models and migration

**Files:**
- Modify: `SourceCode/backend/prisma/schema.prisma`
- Create: `SourceCode/backend/prisma/migrations/20260619000000_add_direct_messages/migration.sql`

- [ ] **Step 1: Add relation fields to the Student model in schema.prisma**

Add these two lines inside the existing `Student` model block (after the `tickets` field):

```prisma
  conversationsAsStudent1  Conversation[]  @relation("ConvStudent1")
  conversationsAsStudent2  Conversation[]  @relation("ConvStudent2")
```

- [ ] **Step 2: Add three new models at the bottom of schema.prisma**

Append after the last model (`Notification`):

```prisma
model Conversation {
  id         String    @id @default(uuid())
  student1Id String
  student2Id String
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt
  student1   Student   @relation("ConvStudent1", fields: [student1Id], references: [id], onDelete: Cascade)
  student2   Student   @relation("ConvStudent2", fields: [student2Id], references: [id], onDelete: Cascade)
  messages   Message[]

  @@unique([student1Id, student2Id])
  @@index([student1Id])
  @@index([student2Id])
}

model Message {
  id             String            @id @default(uuid())
  conversationId String
  senderId       String
  content        String
  read           Boolean           @default(false)
  createdAt      DateTime          @default(now())
  conversation   Conversation      @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  reactions      MessageReaction[]

  @@index([conversationId, createdAt])
  @@index([conversationId, read])
}

model MessageReaction {
  id        String   @id @default(uuid())
  messageId String
  studentId String
  emoji     String
  createdAt DateTime @default(now())
  message   Message  @relation(fields: [messageId], references: [id], onDelete: Cascade)

  @@unique([messageId, studentId])
  @@index([messageId])
}
```

- [ ] **Step 3: Create the migration SQL file**

Create directory `SourceCode/backend/prisma/migrations/20260619000000_add_direct_messages/` and write `migration.sql`:

```sql
CREATE TABLE IF NOT EXISTS "Conversation" (
    "id" TEXT NOT NULL,
    "student1Id" TEXT NOT NULL,
    "student2Id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Message" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "MessageReaction" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageReaction_pkey" PRIMARY KEY ("id")
);

-- Unique and index constraints (IF NOT EXISTS not supported for constraints, use DO blocks)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Conversation_student1Id_student2Id_key'
  ) THEN
    ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_student1Id_student2Id_key" UNIQUE ("student1Id", "student2Id");
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Conversation_student1Id_idx" ON "Conversation"("student1Id");
CREATE INDEX IF NOT EXISTS "Conversation_student2Id_idx" ON "Conversation"("student2Id");
CREATE INDEX IF NOT EXISTS "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");
CREATE INDEX IF NOT EXISTS "Message_conversationId_read_idx" ON "Message"("conversationId", "read");

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'MessageReaction_messageId_studentId_key'
  ) THEN
    ALTER TABLE "MessageReaction" ADD CONSTRAINT "MessageReaction_messageId_studentId_key" UNIQUE ("messageId", "studentId");
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "MessageReaction_messageId_idx" ON "MessageReaction"("messageId");

-- Foreign keys
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Conversation_student1Id_fkey'
  ) THEN
    ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_student1Id_fkey"
      FOREIGN KEY ("student1Id") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Conversation_student2Id_fkey'
  ) THEN
    ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_student2Id_fkey"
      FOREIGN KEY ("student2Id") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Message_conversationId_fkey'
  ) THEN
    ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey"
      FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'MessageReaction_messageId_fkey'
  ) THEN
    ALTER TABLE "MessageReaction" ADD CONSTRAINT "MessageReaction_messageId_fkey"
      FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
```

- [ ] **Step 4: Regenerate Prisma client**

```bash
cd SourceCode/backend && npm run prisma:generate
```

Expected: output includes `Generated Prisma Client`. No errors. Verify `Conversation`, `Message`, `MessageReaction` appear in the generated types by checking `node_modules/.prisma/client/index.d.ts` for `findMany` on `conversation`.

- [ ] **Step 5: Commit**

```bash
git add SourceCode/backend/prisma/schema.prisma SourceCode/backend/prisma/migrations/
git commit -m "feat: add Conversation, Message, MessageReaction Prisma models"
```

---

## Task 3: Write failing tests for messages controller

**Files:**
- Create: `SourceCode/backend/src/__tests__/controllers/messagesController.test.ts`

- [ ] **Step 1: Create the test file**

```typescript
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

const STUDENT_A = { id: "stu-a", email: "a@test.com", role: "STUDENT" as const };
const STUDENT_B = { id: "stu-b", email: "b@test.com", role: "STUDENT" as const };

const makeConversation = (overrides = {}) => ({
  id: "conv-1",
  student1Id: "stu-a",
  student2Id: "stu-b",
  createdAt: new Date(),
  updatedAt: new Date(),
  student1: { id: "stu-a", username: "alice", name: "Alice", profileImageUrl: null },
  student2: { id: "stu-b", username: "bob", name: "Bob", profileImageUrl: null },
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
    await getOrCreateConversation(mockRequest({ user: STUDENT_A, body: {} }), res);
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
    (db.follow.findFirst as jest.Mock).mockResolvedValue(null); // no mutual follow
    const res = mockResponse();
    await getOrCreateConversation(
      mockRequest({ user: STUDENT_A, body: { recipientId: "stu-b" } }),
      res,
    );
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("creates and returns a new conversation when mutual follow exists", async () => {
    (db.student.findUnique as jest.Mock).mockResolvedValue({ id: "stu-b" });
    // Both follow directions exist
    (db.follow.findFirst as jest.Mock)
      .mockResolvedValueOnce({ id: "f1" }) // A follows B
      .mockResolvedValueOnce({ id: "f2" }); // B follows A
    (db.conversation.findFirst as jest.Mock).mockResolvedValue(null); // no existing
    (db.conversation.create as jest.Mock).mockResolvedValue(makeConversation());

    const res = mockResponse();
    await getOrCreateConversation(
      mockRequest({ user: STUDENT_A, body: { recipientId: "stu-b" } }),
      res,
    );

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ conversation: expect.objectContaining({ id: "conv-1" }) }),
    );
  });

  it("returns existing conversation (200) when one already exists", async () => {
    (db.student.findUnique as jest.Mock).mockResolvedValue({ id: "stu-b" });
    (db.follow.findFirst as jest.Mock)
      .mockResolvedValueOnce({ id: "f1" })
      .mockResolvedValueOnce({ id: "f2" });
    (db.conversation.findFirst as jest.Mock).mockResolvedValue(makeConversation());

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
      mockRequest({ user: STUDENT_A, params: { conversationId: "conv-1" }, query: {} }),
      res,
    );

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ messages: expect.arrayContaining([expect.objectContaining({ id: "msg-1" })]) }),
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
      where: { conversationId: "conv-1", senderId: { not: "stu-a" }, read: false },
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
      mockRequest({ user: STUDENT_A, params: { messageId: "msg-1" }, body: {} }),
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
      mockRequest({ user: STUDENT_A, params: { messageId: "msg-1" }, body: { emoji: "❤️" } }),
      res,
    );
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("upserts the reaction and returns it", async () => {
    (db.message.findUnique as jest.Mock).mockResolvedValue({
      id: "msg-1",
      conversation: { student1Id: "stu-a", student2Id: "stu-b" },
    });
    const reaction = { id: "r1", messageId: "msg-1", studentId: "stu-a", emoji: "❤️", createdAt: new Date() };
    (db.messageReaction.upsert as jest.Mock).mockResolvedValue(reaction);

    const res = mockResponse();
    await addReaction(
      mockRequest({ user: STUDENT_A, params: { messageId: "msg-1" }, body: { emoji: "❤️" } }),
      res,
    );

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ reaction }));
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
    (db.messageReaction.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });
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
```

- [ ] **Step 2: Run tests to confirm they all fail**

```bash
cd SourceCode/backend && npm test -- --testPathPattern="messagesController" --no-coverage
```

Expected: all tests FAIL with "Cannot find module '../../controllers/messagesController'".

- [ ] **Step 3: Commit the failing tests**

```bash
git add SourceCode/backend/src/__tests__/controllers/messagesController.test.ts
git commit -m "test: add failing tests for messages controller"
```

---

## Task 4: Implement messages controller

**Files:**
- Create: `SourceCode/backend/src/controllers/messagesController.ts`

- [ ] **Step 1: Create the controller**

```typescript
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
    if (!recipientId) return res.status(400).json({ message: "recipientId is required" });
    if (recipientId === studentId) return res.status(400).json({ message: "Cannot DM yourself" });

    const recipient = await prisma.student.findUnique({ where: { id: recipientId } });
    if (!recipient) return res.status(404).json({ message: "Student not found" });

    // Check mutual follow: current student follows recipient AND recipient follows current student
    const [aFollowsB, bFollowsA] = await Promise.all([
      prisma.follow.findFirst({ where: { followerId: studentId, followingId: recipientId } }),
      prisma.follow.findFirst({ where: { followerId: recipientId, followingId: studentId } }),
    ]);

    if (!aFollowsB || !bFollowsA) {
      return res.status(403).json({ message: "Mutual follow required to start a conversation" });
    }

    const [student1Id, student2Id] = canonicalPair(studentId, recipientId);

    const CONV_INCLUDE = {
      student1: { select: STUDENT_SELECT },
      student2: { select: STUDENT_SELECT },
      messages: { orderBy: { createdAt: "desc" } as const, take: 1 },
    };

    const existing = await prisma.conversation.findFirst({
      where: { student1Id, student2Id },
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
    const { cursor, limit = "30" } = req.query as { cursor?: string; limit?: string };

    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) return res.status(404).json({ message: "Conversation not found" });

    if (conversation.student1Id !== studentId && conversation.student2Id !== studentId) {
      return res.status(403).json({ message: "Not a participant" });
    }

    const pageSize = Math.min(parseInt(limit, 10) || 30, 100);

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

    if (!conversation) return res.status(404).json({ message: "Conversation not found" });

    if (conversation.student1Id !== studentId && conversation.student2Id !== studentId) {
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
      include: { conversation: { select: { student1Id: true, student2Id: true } } },
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
```

- [ ] **Step 2: Run tests to confirm they pass**

```bash
cd SourceCode/backend && npm test -- --testPathPattern="messagesController" --no-coverage
```

Expected: all tests PASS.

- [ ] **Step 3: Run full test suite to check for regressions**

```bash
cd SourceCode/backend && npm test -- --no-coverage
```

Expected: all existing tests still pass.

- [ ] **Step 4: Commit**

```bash
git add SourceCode/backend/src/controllers/messagesController.ts
git commit -m "feat: implement messages REST controller"
```

---

## Task 5: Add messages REST routes and wire into server.ts

**Files:**
- Create: `SourceCode/backend/src/routes/messages.ts`
- Modify: `SourceCode/backend/src/server.ts`

- [ ] **Step 1: Create the routes file**

```typescript
import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { roleMiddleware } from "../middleware/roleMiddleware";
import {
  getConversations,
  getOrCreateConversation,
  getMessages,
  markRead,
  addReaction,
  removeReaction,
} from "../controllers/messagesController";

const router = Router();

router.use(authMiddleware);
router.use(roleMiddleware("STUDENT"));

router.get("/conversations", getConversations);
router.post("/conversations", getOrCreateConversation);
router.get("/conversations/:conversationId", getMessages);
router.patch("/conversations/:conversationId/read", markRead);
router.post("/:messageId/reactions", addReaction);
router.delete("/:messageId/reactions", removeReaction);

export default router;
```

- [ ] **Step 2: Check roleMiddleware signature**

Read `SourceCode/backend/src/middleware/roleMiddleware.ts` to confirm the function signature before wiring. If it exports differently, adjust the import in Step 1.

- [ ] **Step 3: Add the messages route to server.ts**

In `SourceCode/backend/src/server.ts`, add this import at the top with the other route imports:

```typescript
import messagesRoutes from "./routes/messages";
```

And mount it after the existing route mounts (before error handlers):

```typescript
app.use("/messages", messagesRoutes);
```

- [ ] **Step 4: Compile TypeScript to check for errors**

```bash
cd SourceCode/backend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add SourceCode/backend/src/routes/messages.ts SourceCode/backend/src/server.ts
git commit -m "feat: add messages REST routes"
```

---

## Task 6: Add Socket.io server

**Files:**
- Create: `SourceCode/backend/src/socket/index.ts`
- Modify: `SourceCode/backend/src/server.ts`

- [ ] **Step 1: Create the socket module**

```typescript
import { Server } from "socket.io";
import { Server as HttpServer } from "http";
import jwt from "jsonwebtoken";
import prisma from "../utils/prisma";
import { sendNotificationToUser, getUserPushTokens } from "../services/notifications";

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
      async ({ conversationId, content }: { conversationId: string; content: string }) => {
        try {
          if (!conversationId || !content?.trim()) {
            socket.emit("error", { message: "conversationId and content are required" });
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

          if (conversation.student1Id !== studentId && conversation.student2Id !== studentId) {
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

          const recipientSockets = await io.in(`room:${recipientId}`).fetchSockets();
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
      // We derive recipientId from the conversation asynchronously
      prisma.conversation
        .findUnique({ where: { id: conversationId } })
        .then((conv) => {
          if (!conv) return;
          const recipientId =
            conv.student1Id === studentId ? conv.student2Id : conv.student1Id;
          io.to(`room:${recipientId}`).emit("typing", { conversationId, studentId });
        })
        .catch(() => {});
    });

    socket.on("react_message", async ({ messageId, emoji }: { messageId: string; emoji: string }) => {
      try {
        const message = await prisma.message.findUnique({
          where: { id: messageId },
          include: { conversation: { select: { student1Id: true, student2Id: true } } },
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
    });
  });

  return io;
}
```

- [ ] **Step 2: Update server.ts to use http.createServer and init socket**

Replace the bottom of `server.ts` — specifically the `app.listen` call — with the following. Also add the necessary imports at the top.

Add imports at the top of `server.ts`:

```typescript
import http from "http";
import { initSocket } from "./socket/index";
```

Replace:
```typescript
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
  startEventReminderJob();
});
```

With:
```typescript
const PORT = process.env.PORT || 3001;
const httpServer = http.createServer(app);
initSocket(httpServer);
httpServer.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
  startEventReminderJob();
});
```

- [ ] **Step 3: Compile TypeScript**

```bash
cd SourceCode/backend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add SourceCode/backend/src/socket/index.ts SourceCode/backend/src/server.ts
git commit -m "feat: add Socket.io server with JWT auth, send_message, typing, and react_message events"
```

---

## Task 7: Frontend messages API helper

**Files:**
- Create: `SourceCode/frontend/lib/messagesApi.ts`

- [ ] **Step 1: Create the API helper**

Look at `SourceCode/frontend/lib/postsApi.ts` for the `handleResponse` helper pattern (lines 12–60) — copy that function into `messagesApi.ts` as a local helper so the module is self-contained.

```typescript
import { API_URL } from "./api";
import * as SecureStore from "expo-secure-store";
import { AuthError, clearSession } from "./auth";

async function handleResponse(response: Response) {
  const text = await response.text();

  if (!response.ok) {
    let parsed: any | null = null;
    try { parsed = JSON.parse(text); } catch { /* ignore */ }

    let message: string;
    if (typeof parsed?.error === "string") message = parsed.error;
    else if (typeof parsed?.message === "string") message = parsed.message;
    else message = `HTTP ${response.status}`;

    if (
      response.status === 401 &&
      (message.toLowerCase().includes("expired") || message.toLowerCase().includes("invalid"))
    ) {
      await clearSession();
      throw new AuthError(message);
    }

    throw new Error(message);
  }

  if (response.status === 204) return null;
  return JSON.parse(text);
}

async function authHeaders(): Promise<Record<string, string>> {
  const token = await SecureStore.getItemAsync("token");
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// ----- Types ----------------------------------------------------------------

export interface OtherStudent {
  id: string;
  username: string;
  name: string | null;
  profileImageUrl: string | null;
}

export interface MessageReaction {
  id: string;
  messageId: string;
  studentId: string;
  emoji: string;
  createdAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  read: boolean;
  createdAt: string;
  reactions: MessageReaction[];
}

export interface ConversationSummary {
  id: string;
  otherStudent: OtherStudent;
  lastMessage: Message | null;
  unreadCount: number;
  updatedAt: string;
}

// ----- API calls ------------------------------------------------------------

export async function fetchConversations(): Promise<ConversationSummary[]> {
  const res = await fetch(`${API_URL}/messages/conversations`, {
    headers: await authHeaders(),
  });
  const data = await handleResponse(res);
  return data.conversations;
}

export async function getOrCreateConversation(
  recipientId: string,
): Promise<{ conversation: { id: string }; status: number }> {
  const headers = await authHeaders();
  const res = await fetch(`${API_URL}/messages/conversations`, {
    method: "POST",
    headers,
    body: JSON.stringify({ recipientId }),
  });
  const data = await handleResponse(res);
  return { conversation: data.conversation, status: res.status };
}

export async function fetchMessages(
  conversationId: string,
  cursor?: string,
): Promise<Message[]> {
  const params = new URLSearchParams({ limit: "30" });
  if (cursor) params.set("cursor", cursor);
  const res = await fetch(
    `${API_URL}/messages/conversations/${conversationId}?${params}`,
    { headers: await authHeaders() },
  );
  const data = await handleResponse(res);
  return data.messages;
}

export async function markConversationRead(conversationId: string): Promise<void> {
  const res = await fetch(
    `${API_URL}/messages/conversations/${conversationId}/read`,
    { method: "PATCH", headers: await authHeaders() },
  );
  await handleResponse(res);
}

export async function addReaction(messageId: string, emoji: string): Promise<MessageReaction> {
  const res = await fetch(`${API_URL}/messages/${messageId}/reactions`, {
    method: "POST",
    headers: await authHeaders(),
    body: JSON.stringify({ emoji }),
  });
  const data = await handleResponse(res);
  return data.reaction;
}

export async function removeReaction(messageId: string): Promise<void> {
  const res = await fetch(`${API_URL}/messages/${messageId}/reactions`, {
    method: "DELETE",
    headers: await authHeaders(),
  });
  await handleResponse(res);
}
```

- [ ] **Step 2: Typecheck**

```bash
cd SourceCode/frontend && npx tsc --noEmit
```

Expected: no errors in `messagesApi.ts`.

- [ ] **Step 3: Commit**

```bash
git add SourceCode/frontend/lib/messagesApi.ts
git commit -m "feat: add messagesApi frontend helper"
```

---

## Task 8: Frontend useSocket hook

**Files:**
- Create: `SourceCode/frontend/app/hooks/useSocket.ts`

- [ ] **Step 1: Create the hook**

```typescript
import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import * as SecureStore from "expo-secure-store";
import { API_URL } from "../../lib/api";

let socketInstance: Socket | null = null;

/** Returns the shared socket singleton. */
export function getSocket(): Socket | null {
  return socketInstance;
}

/**
 * Initialises and tears down the Socket.io connection.
 * Mount once at Students/_layout.tsx level.
 */
export function useSocket(): Socket | null {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    let active = true;

    async function connect() {
      const token = await SecureStore.getItemAsync("token");
      if (!token || !active) return;

      const socket = io(API_URL, {
        auth: { token },
        transports: ["websocket"],
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
      });

      socket.on("connect_error", (err) => {
        console.warn("Socket connect error:", err.message);
      });

      socketRef.current = socket;
      socketInstance = socket;
    }

    connect();

    return () => {
      active = false;
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        socketInstance = null;
      }
    };
  }, []);

  return socketRef.current;
}
```

- [ ] **Step 2: Typecheck**

```bash
cd SourceCode/frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add SourceCode/frontend/app/hooks/useSocket.ts
git commit -m "feat: add useSocket hook for Socket.io lifecycle management"
```

---

## Task 9: Update BottomNavStudent and Students layout

**Files:**
- Modify: `SourceCode/frontend/app/components/BottomNavStudent.tsx`
- Modify: `SourceCode/frontend/app/Students/_layout.tsx`

- [ ] **Step 1: Add Messages tab to BottomNavStudent**

`BottomNavStudent.tsx` currently has `TABS` defined as a 3-item array. Add a fourth entry and an `unreadCount` prop:

Update the `Props` interface to:
```typescript
interface Props {
  activeTab: string | null;
  onTabPress: (tab: string) => void;
  unreadMessageCount?: number;
}
```

Replace the `TABS` array:
```typescript
const TABS = [
  { key: "events", label: "Events", icon: "calendar" as const },
  { key: "tickets", label: "Tickets", icon: "ticket" as const },
  { key: "social", label: "Social", icon: "people" as const },
  { key: "messages", label: "Messages", icon: "chatbubble" as const },
];
```

Update the function signature:
```typescript
export default function BottomNavStudent({ activeTab, onTabPress, unreadMessageCount = 0 }: Props) {
```

Inside the `{TABS.map(...)}` block, after the `{isActive && <View style={styles.activeDot} />}` line, add an unread badge for the messages tab:

```tsx
{tab.key === "messages" && unreadMessageCount > 0 && (
  <View style={styles.badge}>
    <Text style={styles.badgeText}>
      {unreadMessageCount > 99 ? "99+" : unreadMessageCount}
    </Text>
  </View>
)}
```

Add to `StyleSheet.create`:
```typescript
badge: {
  position: "absolute",
  top: 2,
  right: 10,
  backgroundColor: colours.primary,
  borderRadius: 8,
  minWidth: 16,
  height: 16,
  alignItems: "center",
  justifyContent: "center",
  paddingHorizontal: 3,
},
badgeText: {
  color: "#fff",
  fontSize: 9,
  fontWeight: "700",
},
```

- [ ] **Step 2: Update Students/_layout.tsx**

Replace the contents of `Students/_layout.tsx` with:

```tsx
import React, { useMemo, useEffect, useState, useCallback } from "react";
import { AppState } from "react-native";
import { Tabs, usePathname, useRouter } from "expo-router";
import { registerForPushNotifications } from "../../lib/notifications";
import { fetchConversations } from "../../lib/messagesApi";
import { useSocket } from "../hooks/useSocket";
import BottomNavStudent from "../components/BottomNavStudent";

export default function StudentsLayout() {
  const pathname = usePathname();
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);

  useSocket();

  useEffect(() => {
    registerForPushNotifications().catch((err) =>
      console.error("Push registration error:", err),
    );
  }, []);

  const refreshUnread = useCallback(async () => {
    try {
      const convs = await fetchConversations();
      const total = convs.reduce((sum, c) => sum + c.unreadCount, 0);
      setUnreadCount(total);
    } catch {
      // ignore — badge just won't update
    }
  }, []);

  useEffect(() => {
    refreshUnread();
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") refreshUnread();
    });
    return () => sub.remove();
  }, [refreshUnread]);

  const activeTab = useMemo(() => {
    if (pathname.includes("EventFeed")) return "events";
    if (pathname.includes("myTickets")) return "tickets";
    if (pathname.includes("socialStudent")) return "social";
    if (pathname.includes("messages") || pathname.includes("conversation")) return "messages";
    return null;
  }, [pathname]);

  const routeForTab = (tab: string) => {
    if (tab === "events") return "/Students/EventFeed";
    if (tab === "tickets") return "/Students/myTickets";
    if (tab === "social") return "/Students/socialStudent";
    if (tab === "messages") return "/Students/messages";
    return "/Students/EventFeed";
  };

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={() => (
        <BottomNavStudent
          activeTab={activeTab}
          unreadMessageCount={unreadCount}
          onTabPress={(tab) => {
            if (tab === activeTab && tab !== "messages") {
              router.setParams({ _r: Date.now().toString() });
              return;
            }
            router.replace(routeForTab(tab) as any);
          }}
        />
      )}
    >
      <Tabs.Screen name="EventFeed" options={{ href: null }} />
      <Tabs.Screen name="myTickets" options={{ href: null }} />
      <Tabs.Screen name="socialStudent" options={{ href: null }} />
      <Tabs.Screen name="profileStudent" options={{ href: null }} />
      <Tabs.Screen name="profileOrg" options={{ href: null }} />
      <Tabs.Screen name="messages" options={{ href: null }} />
      <Tabs.Screen name="conversation" options={{ href: null }} />
    </Tabs>
  );
}
```

- [ ] **Step 3: Typecheck**

```bash
cd SourceCode/frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add SourceCode/frontend/app/components/BottomNavStudent.tsx SourceCode/frontend/app/Students/_layout.tsx
git commit -m "feat: add Messages tab to student nav with unread badge"
```

---

## Task 10: Conversations list screen

**Files:**
- Create: `SourceCode/frontend/app/Students/messages.tsx`

- [ ] **Step 1: Create the screen**

```tsx
import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Image,
} from "react-native";
import { useRouter } from "expo-router";
import { colours } from "../../lib/theme/colours";
import { fetchConversations, ConversationSummary } from "../../lib/messagesApi";

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours < 24) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  if (diffHours < 24 * 7) {
    return date.toLocaleDateString([], { weekday: "short" });
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function MessagesScreen() {
  const router = useRouter();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await fetchConversations();
      setConversations(data);
    } catch (err) {
      console.error("Failed to load conversations:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colours.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Messages</Text>
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colours.primary} />
        }
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>No conversations yet.</Text>
            <Text style={styles.emptySubText}>
              Mutually follow a student to start messaging.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const { otherStudent, lastMessage, unreadCount } = item;
          return (
            <Pressable
              style={styles.row}
              onPress={() =>
                router.push({
                  pathname: "/Students/conversation",
                  params: {
                    conversationId: item.id,
                    otherName: otherStudent.name || otherStudent.username,
                    otherStudentId: otherStudent.id,
                  },
                } as any)
              }
            >
              <View style={styles.avatar}>
                {otherStudent.profileImageUrl ? (
                  <Image source={{ uri: otherStudent.profileImageUrl }} style={styles.avatarImg} />
                ) : (
                  <Text style={styles.avatarFallback}>
                    {(otherStudent.name || otherStudent.username).charAt(0).toUpperCase()}
                  </Text>
                )}
              </View>
              <View style={styles.rowBody}>
                <View style={styles.rowTop}>
                  <Text style={[styles.name, unreadCount > 0 && styles.nameUnread]}>
                    {otherStudent.name || otherStudent.username}
                  </Text>
                  {lastMessage && (
                    <Text style={styles.time}>{formatTime(lastMessage.createdAt)}</Text>
                  )}
                </View>
                <View style={styles.rowBottom}>
                  <Text
                    style={[styles.preview, unreadCount > 0 && styles.previewUnread]}
                    numberOfLines={1}
                  >
                    {lastMessage?.content ?? "No messages yet"}
                  </Text>
                  {unreadCount > 0 && (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colours.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  header: {
    fontSize: 24,
    fontWeight: "700",
    color: colours.text,
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 12,
  },
  emptyText: { fontSize: 16, fontWeight: "600", color: colours.text, marginBottom: 6 },
  emptySubText: { fontSize: 13, color: colours.textMuted, textAlign: "center" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colours.border,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colours.surface,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    overflow: "hidden",
  },
  avatarImg: { width: 48, height: 48 },
  avatarFallback: { fontSize: 20, fontWeight: "700", color: colours.primary },
  rowBody: { flex: 1 },
  rowTop: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
  rowBottom: { flexDirection: "row", alignItems: "center" },
  name: { fontSize: 15, fontWeight: "600", color: colours.text },
  nameUnread: { fontWeight: "700", color: colours.text },
  time: { fontSize: 12, color: colours.textMuted },
  preview: { flex: 1, fontSize: 13, color: colours.textMuted },
  previewUnread: { color: colours.text, fontWeight: "600" },
  badge: {
    backgroundColor: colours.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
    marginLeft: 6,
  },
  badgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
});
```

- [ ] **Step 2: Typecheck**

```bash
cd SourceCode/frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add SourceCode/frontend/app/Students/messages.tsx
git commit -m "feat: add conversations list screen"
```

---

## Task 11: Conversation (chat) screen

**Files:**
- Create: `SourceCode/frontend/app/Students/conversation.tsx`

- [ ] **Step 1: Create the screen**

```tsx
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as SecureStore from "expo-secure-store";
import { colours } from "../../lib/theme/colours";
import {
  fetchMessages,
  markConversationRead,
  Message,
  MessageReaction,
} from "../../lib/messagesApi";
import { getSocket } from "../hooks/useSocket";

const EMOJI_OPTIONS = ["❤️", "😂", "👍", "😮", "😢", "🔥", "👏"];

function groupReactions(reactions: MessageReaction[]): { emoji: string; count: number }[] {
  const map: Record<string, number> = {};
  for (const r of reactions) {
    map[r.emoji] = (map[r.emoji] ?? 0) + 1;
  }
  return Object.entries(map).map(([emoji, count]) => ({ emoji, count }));
}

export default function ConversationScreen() {
  const router = useRouter();
  const { conversationId, otherName } = useLocalSearchParams<{
    conversationId: string;
    otherName: string;
  }>();

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [myStudentId, setMyStudentId] = useState<string | null>(null);
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const listRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingSentRef = useRef(0);
  const oldestCursorRef = useRef<string | undefined>(undefined);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    SecureStore.getItemAsync("studentId").then((id) => setMyStudentId(id));
  }, []);

  const load = useCallback(async () => {
    try {
      const data = await fetchMessages(conversationId);
      // API returns newest-first; display newest at bottom
      setMessages(data.slice().reverse());
      if (data.length > 0) {
        oldestCursorRef.current = data[data.length - 1].createdAt;
      }
      setHasMore(data.length === 30);
      await markConversationRead(conversationId);
    } catch (err) {
      console.error("Failed to load messages:", err);
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => { load(); }, [load]);

  // Socket.io event listeners
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const onNewMessage = (msg: Message) => {
      if (msg.conversationId !== conversationId) return;
      setMessages((prev) => {
        // Avoid duplicates (sender echo)
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      markConversationRead(conversationId).catch(() => {});
    };

    const onTyping = ({ conversationId: cid }: { conversationId: string }) => {
      if (cid !== conversationId) return;
      setIsOtherTyping(true);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => setIsOtherTyping(false), 3000);
    };

    const onReaction = ({
      messageId,
      reaction,
    }: {
      messageId: string;
      reaction: MessageReaction;
    }) => {
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== messageId) return m;
          const filtered = m.reactions.filter((r) => r.studentId !== reaction.studentId);
          return { ...m, reactions: [...filtered, reaction] };
        }),
      );
    };

    socket.on("new_message", onNewMessage);
    socket.on("typing", onTyping);
    socket.on("message_reaction", onReaction);

    return () => {
      socket.off("new_message", onNewMessage);
      socket.off("typing", onTyping);
      socket.off("message_reaction", onReaction);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, [conversationId]);

  const sendMessage = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const socket = getSocket();
    if (!socket) return;
    socket.emit("send_message", { conversationId, content: trimmed });
    setText("");
  };

  const onChangeText = (val: string) => {
    setText(val);
    const now = Date.now();
    if (now - lastTypingSentRef.current > 2000) {
      lastTypingSentRef.current = now;
      getSocket()?.emit("typing", { conversationId });
    }
  };

  const sendReaction = (messageId: string, emoji: string) => {
    getSocket()?.emit("react_message", { messageId, emoji });
    setSelectedMessageId(null);
  };

  const loadMore = async () => {
    if (loadingMore || !hasMore || !oldestCursorRef.current) return;
    setLoadingMore(true);
    try {
      const older = await fetchMessages(conversationId, oldestCursorRef.current);
      if (older.length === 0) {
        setHasMore(false);
        return;
      }
      const reversed = older.slice().reverse();
      setMessages((prev) => [...reversed, ...prev]);
      oldestCursorRef.current = older[older.length - 1].createdAt;
      setHasMore(older.length === 30);
    } catch {
      // silent
    } finally {
      setLoadingMore(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colours.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colours.text} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {otherName}
        </Text>
      </View>

      {/* Message list */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        onEndReached={loadMore}
        onEndReachedThreshold={0.2}
        ListHeaderComponent={
          loadingMore ? <ActivityIndicator style={{ marginVertical: 8 }} color={colours.primary} /> : null
        }
        ListFooterComponent={
          isOtherTyping ? (
            <View style={styles.typingRow}>
              <Text style={styles.typingText}>•••</Text>
            </View>
          ) : null
        }
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const isMe = item.senderId === myStudentId;
          const grouped = groupReactions(item.reactions);
          return (
            <View style={[styles.bubbleWrapper, isMe ? styles.bubbleRight : styles.bubbleLeft]}>
              <Pressable
                onLongPress={() => setSelectedMessageId(item.id)}
                style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}
              >
                <Text style={[styles.bubbleText, isMe ? styles.bubbleTextMe : styles.bubbleTextThem]}>
                  {item.content}
                </Text>
              </Pressable>
              {grouped.length > 0 && (
                <View style={styles.reactionsRow}>
                  {grouped.map(({ emoji, count }) => (
                    <View key={emoji} style={styles.reactionPill}>
                      <Text style={styles.reactionEmoji}>{emoji}</Text>
                      {count > 1 && <Text style={styles.reactionCount}>{count}</Text>}
                    </View>
                  ))}
                </View>
              )}
            </View>
          );
        }}
      />

      {/* Emoji picker modal */}
      <Modal
        visible={!!selectedMessageId}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedMessageId(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setSelectedMessageId(null)}>
          <View style={styles.emojiPicker}>
            {EMOJI_OPTIONS.map((emoji) => (
              <Pressable
                key={emoji}
                onPress={() => selectedMessageId && sendReaction(selectedMessageId, emoji)}
                style={styles.emojiBtn}
              >
                <Text style={styles.emoji}>{emoji}</Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      {/* Input bar */}
      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={onChangeText}
          placeholder="Message..."
          placeholderTextColor={colours.textMuted}
          multiline
          maxLength={500}
          returnKeyType="send"
          onSubmitEditing={sendMessage}
          blurOnSubmit
        />
        <Pressable onPress={sendMessage} style={styles.sendBtn} disabled={!text.trim()}>
          <Ionicons
            name="send"
            size={20}
            color={text.trim() ? colours.primary : colours.textMuted}
          />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colours.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 56,
    paddingBottom: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: colours.border,
    backgroundColor: colours.surface,
  },
  backBtn: { padding: 8 },
  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: "700",
    color: colours.text,
    marginLeft: 4,
  },
  listContent: { padding: 12, paddingBottom: 8 },
  bubbleWrapper: { marginBottom: 12 },
  bubbleLeft: { alignItems: "flex-start" },
  bubbleRight: { alignItems: "flex-end" },
  bubble: {
    maxWidth: "75%",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleMe: { backgroundColor: colours.primary, borderBottomRightRadius: 4 },
  bubbleThem: { backgroundColor: colours.surface, borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 15, lineHeight: 20 },
  bubbleTextMe: { color: "#fff" },
  bubbleTextThem: { color: colours.text },
  reactionsRow: { flexDirection: "row", flexWrap: "wrap", marginTop: 4, gap: 4 },
  reactionPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colours.surface,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: colours.border,
  },
  reactionEmoji: { fontSize: 14 },
  reactionCount: { fontSize: 12, color: colours.textMuted, marginLeft: 3 },
  typingRow: { paddingHorizontal: 16, paddingVertical: 8 },
  typingText: {
    fontSize: 22,
    color: colours.textMuted,
    letterSpacing: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  emojiPicker: {
    flexDirection: "row",
    backgroundColor: colours.surface,
    borderRadius: 32,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  emojiBtn: { padding: 4 },
  emoji: { fontSize: 28 },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colours.border,
    backgroundColor: colours.surface,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    backgroundColor: colours.background,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: colours.text,
    marginRight: 8,
  },
  sendBtn: { padding: 8, marginBottom: 2 },
});
```

- [ ] **Step 2: Check that `studentId` is stored in SecureStore on login**

The hook reads `await SecureStore.getItemAsync("studentId")`. Check the auth login flow in `SourceCode/frontend/lib/auth.ts` to confirm the `studentId` is saved there on login. If it's stored under a different key, update the `getItemAsync` call in this file to match. Do NOT change the auth file itself.

- [ ] **Step 3: Typecheck**

```bash
cd SourceCode/frontend && npx tsc --noEmit
```

Expected: no type errors.

- [ ] **Step 4: Run lint**

```bash
cd SourceCode/frontend && npm run lint
```

Fix any lint warnings.

- [ ] **Step 5: Commit**

```bash
git add SourceCode/frontend/app/Students/conversation.tsx
git commit -m "feat: add conversation chat screen with real-time messages, reactions, and typing indicator"
```

---

## Task 12: End-to-end smoke test

- [ ] **Step 1: Start backend dev server**

```bash
cd SourceCode/backend && npm run dev
```

Expected: `Backend running on port 3001` in output (no Socket.io errors).

- [ ] **Step 2: Start frontend**

```bash
cd SourceCode/frontend && npm run start
```

- [ ] **Step 3: Test the happy path**

Using two student accounts that mutually follow each other:

1. Log in as Student A — verify Messages tab appears in bottom nav
2. Navigate to Messages — list should be empty initially
3. On Student A's profile screen, start a conversation with Student B (this requires the `getOrCreateConversation` call — trigger it from the profile screen or via a temporary test button)
4. Send a message — verify it appears in Student A's bubble (right-aligned)
5. On Student B (second device/simulator): open the conversation — verify the message arrived and the unread badge showed on their Messages tab
6. Student B replies — verify real-time delivery on Student A's screen
7. Student A long-presses a message — verify emoji picker appears and a reaction can be added
8. Verify the reaction pill appears below the bubble on both screens

- [ ] **Step 4: Final full-suite backend test**

```bash
cd SourceCode/backend && npm test -- --no-coverage
```

Expected: all tests pass.
