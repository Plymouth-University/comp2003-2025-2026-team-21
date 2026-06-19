import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { requireRole } from "../middleware/roleMiddleware";
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
router.use(requireRole("STUDENT"));

router.get("/conversations", getConversations);
router.post("/conversations", getOrCreateConversation);
router.get("/conversations/:conversationId", getMessages);
router.patch("/conversations/:conversationId/read", markRead);
router.post("/:messageId/reactions", addReaction);
router.delete("/:messageId/reactions", removeReaction);

export default router;
