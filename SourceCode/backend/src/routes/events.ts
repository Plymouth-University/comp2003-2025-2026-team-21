import { Router } from "express";
import { authMiddleware } from "../middleware/authMiddleware";
import { requireRole } from "../middleware/roleMiddleware";
import eventsController from "../controllers/eventsController";

const router = Router();

// Public: get all events
router.get("/", eventsController.getAllEvents);

// Organisations only: get events created by the logged-in organiser
router.get(
	"/mine",
	authMiddleware,
	requireRole("ORGANISATION"),
	eventsController.getMyEvents
);

// Organisations only: update an event owned by the logged-in organiser
router.patch(
	"/:id",
	authMiddleware,
	requireRole("ORGANISATION"),
	eventsController.updateEvent
);

// Organisations only: delete an event owned by the logged-in organiser
router.delete(
	"/:id",
	authMiddleware,
	requireRole("ORGANISATION"),
	eventsController.deleteEvent
);

// Organisations only: create event
router.post(
	"/",
	authMiddleware,
	requireRole("ORGANISATION"),
	eventsController.createEvent
);

export default router;
