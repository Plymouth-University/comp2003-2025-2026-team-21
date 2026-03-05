import { Request, Response } from "express";
import prisma from "../utils/prisma";

// create a ticket for an event (student only)
export const createTicket = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.user?.id;
    // @ts-ignore
    const role = req.user?.role;

    if (!userId || role !== "student") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const { eventId } = req.body;
    if (!eventId) {
      return res.status(400).json({ message: "Missing eventId" });
    }

    // ensure event exists
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      return res.status(404).json({ message: "Event not found" });
    }

    // avoid duplicate tickets
    const existing = await prisma.ticket.findUnique({
      where: { studentId_eventId: { studentId: userId, eventId } },
    });
    if (existing) {
      return res.status(409).json({ message: "Ticket already exists" });
    }

    const ticket = await prisma.ticket.create({
      data: {
        studentId: userId,
        eventId,
      },
    });

    // return event details rather than raw ticket to match front-end expectations
    const payload = {
      id: event.id,
      title: event.title,
      description: event.description,
      date: event.date,
      location: event.location,
      price: event.price,
      organiserId: event.organiserId,
      createdAt: event.createdAt,
      eventImage: event.eventImage,
      eventImageMimeType: event.eventImageMimeType,
      organiser: null as any, // will fill later
    };

    // fetch organiser info
    const organiser = await prisma.organisation.findUnique({
      where: { id: event.organiserId },
      select: { id: true, name: true, location: true },
    });
    payload.organiser = organiser;

    return res.status(201).json({ ticket: payload });
  } catch (error) {
    console.error("Error creating ticket:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};

export const getMyTickets = async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const userId = req.user?.id;
    // @ts-ignore
    const role = req.user?.role;

    if (!userId || role !== "student") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const raw = await prisma.ticket.findMany({
      where: { studentId: userId },
      include: {
        event: {
          include: {
            organiser: { select: { id: true, name: true, location: true } },
          },
        },
      },
    });

    const tickets = raw.map((t) => {
      const ev = t.event;
      return {
        id: ev.id,
        title: ev.title,
        description: ev.description,
        date: ev.date,
        location: ev.location,
        price: ev.price,
        organiserId: ev.organiserId,
        createdAt: ev.createdAt,
        eventImage: ev.eventImage,
        eventImageMimeType: ev.eventImageMimeType,
        organiser: ev.organiser,
      };
    });

    return res.json({ tickets });
  } catch (error) {
    console.error("Error fetching tickets:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};

export const deleteTicket = async (req: Request, res: Response) => {
  try {
    // optional route: student may cancel ticket
    // @ts-ignore
    const userId = req.user?.id;
    // @ts-ignore
    const role = req.user?.role;

    if (!userId || role !== "student") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const { id } = req.params;
    // id is event id in our mapping
    const ticket = await prisma.ticket.findUnique({
      where: { studentId_eventId: { studentId: userId, eventId: id } },
    });
    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    await prisma.ticket.delete({
      where: { id: ticket.id },
    });

    return res.json({ message: "Ticket deleted" });
  } catch (error) {
    console.error("Error deleting ticket", error);
    return res.status(500).json({ message: "Server error", error });
  }
};

const ticketsController = {
  createTicket,
  getMyTickets,
  deleteTicket,
};

export default ticketsController;
