import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, ordersTable } from "@workspace/db";
import { CreateOrderBody, GetOrderParams, CreateOrderResponse, GetOrderResponse } from "@workspace/api-zod";

const router: IRouter = Router();

const toOrderResponse = (order: typeof ordersTable.$inferSelect) => ({
  id: order.id,
  status: order.status,
  prepMinutes: order.prepMinutes,
  eta: order.eta,
  total: Number(order.total),
  createdAt: order.createdAt,
});

router.post("/orders", async (req, res): Promise<void> => {
  const parsed = CreateOrderBody.safeParse(req.body);
  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.message }, "Invalid order request");
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const prepMinutes = 12 + Math.min(8, parsed.data.items.reduce((count, item) => count + item.quantity, 0) * 2);
  const eta = new Date(Date.now() + prepMinutes * 60_000);
  const [order] = await db.insert(ordersTable).values({
    customerName: parsed.data.customerName,
    customerEmail: parsed.data.customerEmail,
    orderType: parsed.data.orderType,
    items: parsed.data.items,
    total: parsed.data.total.toFixed(2),
    prepMinutes,
    eta,
  }).returning();

  res.status(201).json(CreateOrderResponse.parse(toOrderResponse(order)));
});

router.get("/orders/:id", async (req, res): Promise<void> => {
  const params = GetOrderParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [order] = await db.select().from(ordersTable).where(eq(ordersTable.id, params.data.id));
  if (!order) {
    res.status(404).json({ error: "Order not found" });
    return;
  }

  res.json(GetOrderResponse.parse(toOrderResponse(order)));
});

export default router;