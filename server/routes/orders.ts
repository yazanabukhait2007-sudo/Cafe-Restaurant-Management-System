import express from "express";
import { prisma } from "../lib/prisma.ts";
import { authenticate, authorize, AuthRequest } from "../middleware/auth.ts";
import { validate } from "../middleware/validate.ts";
import { rateLimit } from "../middleware/rateLimit.ts";
import { createOrderSchema, updateOrderStatusSchema } from "../validation/schemas.ts";

const router = express.Router();

// Sensitive endpoint rate limiting to avoid spamming orders
const orderCreationLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30,                 // Up to 30 requests per minute from a client IP
  message: "Too many orders are being submitted. Please try again in a minute.",
});

router.post("/", authenticate, authorize(["orders:create"]), orderCreationLimiter, validate({ body: createOrderSchema }), async (req: AuthRequest, res) => {
  const { tableId, items, notes, type } = req.body;

  try {
    // 1. Gather all product IDs from the request
    const productIds = items.map((i: any) => i.productId);

    // 2. Query database for products and their variants to obtain validated prices
    const dbProducts = await prisma.product.findMany({
      where: { id: { in: productIds } },
      include: { variants: true },
    });

    const dbProductsMap = new Map(dbProducts.map((p) => [p.id, p]));

    // 3. Structured pricing calculations using only database record values
    let subtotal = 0;
    const orderItemsData = [];

    // Query for all modifiers in all items to avoid N+1
    const allModifierIds = items.flatMap((i: any) => i.modifiers || []);
    const dbModifiers = await prisma.modifier.findMany({
      where: { id: { in: allModifierIds } }
    });
    const dbModifiersMap = new Map(dbModifiers.map(m => [m.id, m]));

    for (const item of items) {
      const dbProduct = dbProductsMap.get(item.productId);
      if (!dbProduct) {
        return res.status(404).json({ message: `Product not found: ${item.productId}` });
      }

      // Start with the base product price
      let trustedPrice = dbProduct.price;

      // If a variant is selected, use the variant's price instead
      if (item.productVariantId) {
        const variant = dbProduct.variants.find((v) => v.id === item.productVariantId);
        if (!variant) {
          return res.status(404).json({
            message: `Selected variant ${item.productVariantId} not found on product ${dbProduct.name}`,
          });
        }
        trustedPrice = variant.price;
      }

      // Add modifier prices
      let modifiersTotal = 0;
      const itemModifiers = [];
      if (item.modifiers && item.modifiers.length > 0) {
        for (const modId of item.modifiers) {
          const dbMod = dbModifiersMap.get(modId);
          if (dbMod) {
            modifiersTotal += dbMod.price;
            itemModifiers.push({
              modifierId: modId,
              price: dbMod.price,
              quantity: 1
            });
          }
        }
      }

      const unitPriceWithModifiers = trustedPrice + modifiersTotal;
      const itemTotal = unitPriceWithModifiers * item.quantity;
      subtotal += itemTotal;

      orderItemsData.push({
        productId: item.productId,
        productVariantId: item.productVariantId || null,
        quantity: item.quantity,
        unitPrice: trustedPrice, // Base unit price
        totalPrice: itemTotal,
        notes: item.notes || null,
        modifiers: {
          create: itemModifiers
        }
      });
    }

    const taxAmount = subtotal * 0.15; // 15% VAT example computed securely
    const total = subtotal + taxAmount;

    const initialStatus = req.body.status || "CONFIRMED";
    const now = new Date();

    // 4. Create the verified Order record
    const order = await prisma.order.create({
      data: {
        tableId,
        type: type || "DineIn",
        notes,
        subtotal,
        taxAmount,
        total,
        status: initialStatus,
        confirmedAt: initialStatus === "CONFIRMED" ? now : null,
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

    // 5. Safely update table status if tableId was supplied
    if (tableId && initialStatus === "CONFIRMED") {
      await prisma.table.update({
        where: { id: tableId },
        data: { status: "Occupied" },
      });
    }

    // 6. Log transaction activity and initial status history
    await prisma.orderStatusHistory.create({
      data: {
        orderId: order.id,
        fromStatus: "NONE",
        toStatus: initialStatus,
        userId: req.user?.id,
        notes: "Initial order created",
      },
    });

    await prisma.activityLog.create({
      data: {
        userId: req.user?.id,
        action: "Create Order",
        module: "Orders",
        details: `Order #${order.id} is created as ${initialStatus} for Table ${order.table?.number || "N/A"}. Computed Subtotal: ${subtotal}, Total: ${total}.`,
      },
    });

    res.json(order);
  } catch (error) {
    console.error("Order Creation Error: ", error);
    res.status(500).json({ message: "Failed to process order safely. Please verify inputs." });
  }
});

router.get("/active", authenticate, async (req: AuthRequest, res) => {
  try {
    const orders = await prisma.order.findMany({
      where: { status: { notIn: ["CLOSED", "CANCELLED"] } },
      include: {
        items: { include: { product: true } },
        table: true,
        statusHistory: {
          include: { user: { select: { name: true, email: true } } },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch active orders" });
  }
});

// Advanced status transition endpoint with validation error reporting and transaction safeguards
router.patch("/:id/status", authenticate, validate({ body: updateOrderStatusSchema }), async (req: AuthRequest, res) => {
  const { status, notes } = req.body;
  const userId = req.user?.id;
  const userRole = req.user?.role;

  if (!userId || !userRole) {
    return res.status(401).json({ message: "User session details are incomplete" });
  }

  try {
    const { processOrderTransition } = await import("../lib/orderWorkflow.ts");
    const result = await processOrderTransition(req.params.id, status, userId, userRole, notes);

    if (!result.success) {
      return res.status(400).json({ message: result.message });
    }

    res.json(result.order);
  } catch (error) {
    console.error("Order Status Transition Error: ", error);
    res.status(500).json({ message: "Internal server error processing transition" });
  }
});

export default router;
