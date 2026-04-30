import prisma from "../../utils/prisma";
import {
  createTicket,
  getMyTickets,
  deleteTicket,
  validateTicket,
} from "../../controllers/ticketsController";
import { mockRequest, mockResponse } from "../helpers";

jest.mock("../../utils/prisma");
jest.mock("../../services/notifications", () => ({
  sendNotificationToUser: jest.fn().mockResolvedValue(undefined),
}));
jest.mock("../../utils/stripe", () => ({
  verifyPaymentIntent: jest.fn(),
}));

import { verifyPaymentIntent } from "../../utils/stripe";

const db = prisma as jest.Mocked<typeof prisma>;
const mockVerify = verifyPaymentIntent as jest.Mock;

// tx mirrors the same mocked prisma methods so $transaction callbacks work
const tx = {
  event: { findUnique: jest.fn() },
  ticket: { findUnique: jest.fn(), create: jest.fn() },
};

// $transaction is not auto-mocked, so we define it manually
(db as any).$transaction = jest.fn((fn: any) => fn(tx));

beforeEach(() => {
  jest.clearAllMocks();
  (db as any).$transaction = jest.fn((fn: any) => fn(tx));
});

const STUDENT = { id: "stu1", email: "s@test.com", role: "STUDENT" as const };
const ORG = { id: "org1", email: "o@test.com", role: "ORGANISATION" as const };

const makeEvent = (overrides = {}) => ({
  id: "evt1",
  title: "Summer Ball",
  description: "Fun event",
  date: new Date("2026-06-01"),
  location: "Plymouth",
  price: 0,
  category: "Social",
  capacity: null,
  organiserId: ORG.id,
  eventImageUrl: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  _count: { tickets: 0 },
  ...overrides,
});

const makeTicket = (overrides = {}) => ({
  id: "tkt1",
  studentId: STUDENT.id,
  eventId: "evt1",
  used: false,
  usedAt: null,
  paymentIntentId: null,
  createdAt: new Date(),
  ...overrides,
});

// ---------------------------------------------------------------------------
// createTicket
// ---------------------------------------------------------------------------
describe("createTicket", () => {
  it("returns 403 when the caller is not a STUDENT", async () => {
    const res = mockResponse();
    await createTicket(
      mockRequest({ user: ORG, body: { eventId: "evt1" } }),
      res,
    );
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("returns 400 when eventId is missing", async () => {
    const res = mockResponse();
    await createTicket(mockRequest({ user: STUDENT, body: {} }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Missing eventId" });
  });

  it("returns 404 when the event does not exist", async () => {
    (db.event.findUnique as jest.Mock).mockResolvedValue(null);

    const res = mockResponse();
    await createTicket(
      mockRequest({ user: STUDENT, body: { eventId: "missing" } }),
      res,
    );

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "Event not found" });
  });

  it("returns 400 when the event is fully booked", async () => {
    const fullyBooked = makeEvent({ capacity: 10, _count: { tickets: 10 } });
    (db.event.findUnique as jest.Mock).mockResolvedValue(fullyBooked);
    (tx.event.findUnique as jest.Mock).mockResolvedValue(fullyBooked);

    const res = mockResponse();
    await createTicket(
      mockRequest({ user: STUDENT, body: { eventId: "evt1" } }),
      res,
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Event is fully booked" });
  });

  it("returns 400 when a paid event requires payment but none is provided", async () => {
    (db.event.findUnique as jest.Mock).mockResolvedValue(
      makeEvent({ price: 15 }),
    );

    const res = mockResponse();
    await createTicket(
      mockRequest({ user: STUDENT, body: { eventId: "evt1" } }),
      res,
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Payment required for this event" }),
    );
  });

  it("returns 400 when the payment intent has not succeeded", async () => {
    (db.event.findUnique as jest.Mock).mockResolvedValue(
      makeEvent({ price: 15 }),
    );
    mockVerify.mockResolvedValue({ succeeded: false });

    const res = mockResponse();
    await createTicket(
      mockRequest({
        user: STUDENT,
        body: { eventId: "evt1", paymentIntentId: "pi_bad" },
      }),
      res,
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "Payment has not been completed",
    });
  });

  it("returns 400 when the payment intent is for a different event", async () => {
    (db.event.findUnique as jest.Mock).mockResolvedValue(
      makeEvent({ price: 15 }),
    );
    mockVerify.mockResolvedValue({ succeeded: true, eventId: "other-event" });

    const res = mockResponse();
    await createTicket(
      mockRequest({
        user: STUDENT,
        body: { eventId: "evt1", paymentIntentId: "pi_wrong" },
      }),
      res,
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "Payment is for a different event",
    });
  });

  it("returns 409 when a ticket already exists for this student+event", async () => {
    (db.event.findUnique as jest.Mock).mockResolvedValue(makeEvent());
    (tx.event.findUnique as jest.Mock).mockResolvedValue(makeEvent());
    (tx.ticket.findUnique as jest.Mock).mockResolvedValue(makeTicket());

    const res = mockResponse();
    await createTicket(
      mockRequest({ user: STUDENT, body: { eventId: "evt1" } }),
      res,
    );

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ message: "Ticket already exists" });
  });

  it("creates a free-event ticket and returns 201 with event details", async () => {
    (db.event.findUnique as jest.Mock).mockResolvedValue(makeEvent());
    (tx.event.findUnique as jest.Mock).mockResolvedValue(makeEvent());
    (tx.ticket.findUnique as jest.Mock).mockResolvedValue(null);
    (tx.ticket.create as jest.Mock).mockResolvedValue(makeTicket());
    (db.organisation.findUnique as jest.Mock).mockResolvedValue({
      id: ORG.id,
      name: "Test Org",
      location: "Plymouth",
    });

    const res = mockResponse();
    await createTicket(
      mockRequest({ user: STUDENT, body: { eventId: "evt1" } }),
      res,
    );

    expect(tx.ticket.create).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    const { ticket } = (res.json as jest.Mock).mock.calls[0][0];
    expect(ticket.title).toBe("Summer Ball");
    expect(ticket.ticketId).toBe("tkt1");
  });

  it("stores paymentIntentId on paid-event ticket", async () => {
    (db.event.findUnique as jest.Mock).mockResolvedValue(
      makeEvent({ price: 10 }),
    );
    (tx.event.findUnique as jest.Mock).mockResolvedValue(
      makeEvent({ price: 10 }),
    );
    (tx.ticket.findUnique as jest.Mock).mockResolvedValue(null);
    mockVerify.mockResolvedValue({ succeeded: true, eventId: "evt1" });
    (tx.ticket.create as jest.Mock).mockResolvedValue(
      makeTicket({ paymentIntentId: "pi_ok" }),
    );
    (db.organisation.findUnique as jest.Mock).mockResolvedValue({
      id: ORG.id,
      name: "Org",
      location: "Plymouth",
    });

    const res = mockResponse();
    await createTicket(
      mockRequest({
        user: STUDENT,
        body: { eventId: "evt1", paymentIntentId: "pi_ok" },
      }),
      res,
    );

    const createArg = (tx.ticket.create as jest.Mock).mock.calls[0][0];
    expect(createArg.data.paymentIntentId).toBe("pi_ok");
  });
});

// ---------------------------------------------------------------------------
// getMyTickets
// ---------------------------------------------------------------------------
describe("getMyTickets", () => {
  it("returns 403 when caller is not a STUDENT", async () => {
    const res = mockResponse();
    await getMyTickets(mockRequest({ user: ORG }), res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("returns formatted tickets for the authenticated student", async () => {
    (db.ticket.findMany as jest.Mock).mockResolvedValue([
      {
        ...makeTicket(),
        event: {
          ...makeEvent(),
          organiser: { id: ORG.id, name: "Test Org", location: "Plymouth" },
        },
      },
    ]);

    const res = mockResponse();
    await getMyTickets(mockRequest({ user: STUDENT }), res);

    const { tickets } = (res.json as jest.Mock).mock.calls[0][0];
    expect(tickets).toHaveLength(1);
    expect(tickets[0].title).toBe("Summer Ball");
    expect(tickets[0].price).toBe("£0.00");
  });
});

// ---------------------------------------------------------------------------
// deleteTicket
// ---------------------------------------------------------------------------
describe("deleteTicket", () => {
  it("returns 403 when caller is not a STUDENT", async () => {
    const res = mockResponse();
    await deleteTicket(mockRequest({ user: ORG, params: { id: "evt1" } }), res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("returns 404 when ticket is not found", async () => {
    (db.ticket.findUnique as jest.Mock).mockResolvedValue(null);

    const res = mockResponse();
    await deleteTicket(
      mockRequest({ user: STUDENT, params: { id: "missing" } }),
      res,
    );

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("deletes the ticket and returns success", async () => {
    (db.ticket.findUnique as jest.Mock).mockResolvedValue(makeTicket());
    (db.ticket.delete as jest.Mock).mockResolvedValue(undefined);

    const res = mockResponse();
    await deleteTicket(
      mockRequest({ user: STUDENT, params: { id: "evt1" } }),
      res,
    );

    expect(db.ticket.delete).toHaveBeenCalledWith({ where: { id: "tkt1" } });
    expect(res.json).toHaveBeenCalledWith({ message: "Ticket deleted" });
  });
});

// ---------------------------------------------------------------------------
// validateTicket
// ---------------------------------------------------------------------------
describe("validateTicket", () => {
  it("returns 403 when caller is not an ORGANISATION", async () => {
    const res = mockResponse();
    await validateTicket(
      mockRequest({ user: STUDENT, body: { ticketId: "tkt1" } }),
      res,
    );
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("returns 400 when ticketId is missing", async () => {
    const res = mockResponse();
    await validateTicket(mockRequest({ user: ORG, body: {} }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Missing ticketId" });
  });

  it("returns 404 when the ticket does not exist", async () => {
    (db.ticket.findUnique as jest.Mock).mockResolvedValue(null);

    const res = mockResponse();
    await validateTicket(
      mockRequest({ user: ORG, body: { ticketId: "missing" } }),
      res,
    );

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("returns 403 when the org does not own the event", async () => {
    (db.ticket.findUnique as jest.Mock).mockResolvedValue({
      ...makeTicket(),
      event: {
        ...makeEvent(),
        organiserId: "other-org",
        organiser: { id: "other-org" },
      },
      student: { id: STUDENT.id, name: "Stu", email: "s@test.com" },
    });

    const res = mockResponse();
    await validateTicket(
      mockRequest({ user: ORG, body: { ticketId: "tkt1" } }),
      res,
    );

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it("returns 400 with ticket info when the ticket is already used", async () => {
    (db.ticket.findUnique as jest.Mock).mockResolvedValue({
      ...makeTicket({ used: true, usedAt: new Date() }),
      event: { ...makeEvent(), organiserId: ORG.id, organiser: { id: ORG.id } },
      student: { id: STUDENT.id, name: "Stu", email: "s@test.com" },
    });

    const res = mockResponse();
    await validateTicket(
      mockRequest({ user: ORG, body: { ticketId: "tkt1" } }),
      res,
    );

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Ticket already used" }),
    );
  });

  it("marks the ticket as used and returns success", async () => {
    const now = new Date();
    (db.ticket.findUnique as jest.Mock).mockResolvedValue({
      ...makeTicket(),
      event: { ...makeEvent(), organiserId: ORG.id, organiser: { id: ORG.id } },
      student: { id: STUDENT.id, name: "Stu", email: "s@test.com" },
    });
    (db.ticket.update as jest.Mock).mockResolvedValue({
      ...makeTicket({ used: true, usedAt: now }),
    });

    const res = mockResponse();
    await validateTicket(
      mockRequest({ user: ORG, body: { ticketId: "tkt1" } }),
      res,
    );

    expect(db.ticket.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { used: true, usedAt: expect.any(Date) },
      }),
    );
    const body = (res.json as jest.Mock).mock.calls[0][0];
    expect(body.success).toBe(true);
    expect(body.ticket.used).toBe(true);
  });
});
