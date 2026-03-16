import express from "express";
import ticketsController from "../controllers/ticketsController";
import { authMiddleware } from "../middleware/authMiddleware";

const router = express.Router();

// student endpoints - require auth
router.post("/", authMiddleware, ticketsController.createTicket);
router.get("/mine", authMiddleware, ticketsController.getMyTickets);
router.delete("/:id", authMiddleware, ticketsController.deleteTicket);

export default router;
