import express from "express";
import { prisma } from "../lib/prisma.ts";
import { authenticate, authorize } from "../middleware/auth.ts";
import { validate } from "../middleware/validate.ts";
import { createTableSchema, updateTableStatusSchema } from "../validation/schemas.ts";

const router = express.Router();

router.get("/", authenticate, async (req, res) => {
  try {
    const tables = await prisma.table.findMany({
      include: {
        orders: {
          where: { status: { notIn: ["CLOSED", "CANCELLED"] } },
        },
      },
    });
    res.json(tables);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch tables" });
  }
});

router.post("/", authenticate, authorize(["tables:manage"]), validate({ body: createTableSchema }), async (req, res) => {
  const { number, capacity } = req.body;
  try {
    const table = await prisma.table.create({ data: { number, capacity } });
    res.json(table);
  } catch (error) {
    res.status(500).json({ message: "Failed to create table" });
  }
});

router.patch("/:id/status", authenticate, validate({ body: updateTableStatusSchema }), async (req, res) => {
  const { status } = req.body;
  try {
    const table = await prisma.table.update({
      where: { id: req.params.id },
      data: { status },
    });
    res.json(table);
  } catch (error) {
    res.status(500).json({ message: "Failed to update table" });
  }
});

export default router;
