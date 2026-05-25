import express from "express";
import { prisma } from "../lib/prisma.ts";
import { authenticate, authorize, AuthRequest } from "../middleware/auth.ts";

const router = express.Router();

router.post("/", authenticate, authorize(["orders:create"]), async (req: AuthRequest, res) => {
  const { tableId, items, notes, type } = req.body;
  const waiterId = req.user?.id; // Assuming user is also employee? Logic needed.

  try {
    // 1. Calculate totals
    let subtotal = 0;
    const orderItemsData = items.map((item: any) => {
      const itemTotal = item.unitPrice * item.quantity;
      subtotal += itemTotal;
      return {
        productId: item.productId,
        productVariantId: item.productVariantId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: itemTotal,
        notes: item.notes,
      };
    });

    const taxAmount = subtotal * 0.15; // 15% tax example
    const total = subtotal + taxAmount;

    // 2. Create order
    const order = await prisma.order.create({
      data: {
        tableId,
        type: type || "DineIn",
        notes,
        subtotal,
        taxAmount,
        total,
        status: "New",
        items: {
          create: orderItemsData,
        },
      },
      include: {
        items: {
          include: { product: true },
        },
        table: true,
      },
    });

    // 3. Update table status
    if (tableId) {
      await prisma.table.update({
        where: { id: tableId },
        data: { status: "Occupied" },
      });
    }

    // 4. Activity log
    await prisma.activityLog.create({
      data: {
        userId: req.user?.id,
        action: "Create Order",
        module: "Orders",
        details: `Order #${order.id} created for Table ${order.table?.number || "N/A"}`,
      },
    });

    res.json(order);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Failed to create order" });
  }
});

router.get("/active", authenticate, async (req: AuthRequest, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: { status: { notIn: ["Completed", "Cancelled"] } },
      include: {
        items: { include: { product: true } },
        table: true,
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch orders" });
  }
});

router.patch("/:id/status", authenticate, async (req, res) => {
  const { status } = req.body;
  try {
    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: { status },
    });

    // If completed/cancelled, free up the table
    if (["Completed", "Cancelled"].includes(status) && order.tableId) {
      await prisma.table.update({
        where: { id: order.tableId },
        data: { status: "Available" },
      });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: "Failed to update order status" });
  }
});

export default router;
