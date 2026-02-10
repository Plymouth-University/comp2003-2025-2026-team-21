import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { requireRole } from "../middleware/roleMiddleware";
import eventsController from "../controllers/eventsController";

const router = Router();

// Public: get all events
router.get("/", eventsController.getAllEvents);

// Organisations only: create event
router.post(
	"/",
	authMiddleware,
	requireRole("ORGANISATION"),
	eventsController.createEvent
);

export default router;
