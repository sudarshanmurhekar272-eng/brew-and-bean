import { Router, type IRouter } from "express";
import { db, bookingsTable } from "@workspace/db";
import { CreateBookingBody, CreateBookingResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/bookings", async (req, res): Promise<void> => {
  const parsed = CreateBookingBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.message }, "Invalid booking request");
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [booking] = await db.insert(bookingsTable).values({
    name: parsed.data.name,
    email: parsed.data.email,
    date: parsed.data.date.toISOString().slice(0, 10),
    time: parsed.data.time,
    partySize: parsed.data.partySize,
  }).returning();

  res.status(201).json(CreateBookingResponse.parse({
    id: booking.id,
    name: booking.name,
    date: booking.date,
    time: booking.time,
    partySize: booking.partySize,
    status: booking.status,
    createdAt: booking.createdAt,
  }));
});

export default router;