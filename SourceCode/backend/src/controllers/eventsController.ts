import { Request, Response } from "express";
import prisma from "../utils/prisma";

const isValidDate = (value: string) => {
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime());
};

export const createEvent = async (req: Request, res: Response) => {
  try {
    // @ts-ignore - user is set by authMiddleware
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const {
      title,
      description,
      date,
      location,
      price,
      eventImage,
      eventImageMimeType,
    } = req.body;

    if (!title || !date || !location || !price) {
      return res.status(400).json({
        message:
          "Missing required fields: title, date, location, price",
      });
    }

    if (!isValidDate(date)) {
      return res.status(400).json({ message: "Invalid date format" });
    }

    if ((eventImage && !eventImageMimeType) || (!eventImage && eventImageMimeType)) {
      return res.status(400).json({
        message: "eventImage and eventImageMimeType must be provided together",
      });
    }

    const eventImageBuffer = eventImage
      ? Buffer.from(eventImage, "base64")
      : undefined;

    const safeDescription = typeof description === "string" ? description : "";

    const event = await prisma.event.create({
      data: {
        title,
        description: safeDescription,
        date: new Date(date),
        location,
        price,
        organiserId: userId,
        eventImage: eventImageBuffer,
        eventImageMimeType: eventImageMimeType ?? null,
      },
      include: {
        organiser: {
          select: {
            id: true,
            name: true,
            location: true,
          },
        },
      },
    });

    const eventWithBase64 = {
      ...event,
      organiser: {
        id: event.organiser.id,
        name: event.organiser.name,
        location: event.organiser.location,
      },
      eventImage: event.eventImage ? event.eventImage.toString("base64") : null,
    };

    return res.status(201).json({ event: eventWithBase64 });
  } catch (error) {
    console.error("Error creating event:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};

export const getAllEvents = async (req: Request, res: Response) => {
  try {
    const events = await prisma.event.findMany({
      orderBy: { date: "asc" },
      include: {
        organiser: {
          select: {
            id: true,
            name: true,
            location: true,
          },
        },
      },
    });

    const eventsWithBase64 = events.map((event) => ({
      ...event,
      organiser: {
        id: event.organiser.id,
        name: event.organiser.name,
        location: event.organiser.location,
      },
      eventImage: event.eventImage ? event.eventImage.toString("base64") : null,
    }));

    return res.json({ events: eventsWithBase64 });
  } catch (error) {
    console.error("Error fetching events:", error);
    return res.status(500).json({ message: "Server error", error });
  }
};

const eventsController = {
  createEvent,
  getAllEvents,
};

export default eventsController;
