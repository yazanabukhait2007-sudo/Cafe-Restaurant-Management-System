import express from "express";
import { prisma } from "../lib/prisma.ts";
import { authenticate, authorize } from "../middleware/auth.ts";

const router = express.Router();

// HELPER: Create an Activity Log (Audit Trail)
async function logActivity(tx: any, userId: string, action: string, details: string) {
  await tx.activityLog.create({
    data: {
      userId,
      module: "InventoryAudit",
      action,
      details,
    },
  });
}

// HELPER: Create standard Notification
async function createNotification(tx: any, userId: string, title: string, message: string, type: string) {
  await tx.notification.create({
    data: {
      userId,
      title,
      message,
      type, // Info, Warning, Alert
    },
  });
}

/**
 * GET /api/inventory-counts/analytics/reports
 * Variance and audit reports
 */
router.get("/analytics/reports", authenticate, async (req, res) => {
  try {
    // Fetch all completed session items and snapshots
    const sessions = await prisma.inventoryCountSession.findMany({
      where: { status: "Completed" },
      include: {
        items: {
          include: {
            ingredient: true,
          },
        },
      },
    });

    // 1. Calculate overall metrics
    let totalItemsAudited = 0;
    let totalValueDifference = 0; // sum of absolute value difference
    let netValueDifference = 0; // value difference with sign (+ or -)
    const ingredientLossMap: Record<string, { name: string, unit: string, lossQty: number, gainQty: number, lossVal: number, gainVal: number, cost: number }> = {};
    const reasonStats: Record<string, { count: number, value: number }> = {
      "هدر": { count: 0, value: 0 },
      "تلف": { count: 0, value: 0 },
      "سرقة": { count: 0, value: 0 },
      "خطأ إدخال": { count: 0, value: 0 },
      "خطأ جرد": { count: 0, value: 0 },
      "أخرى": { count: 0, value: 0 },
    };

    sessions.forEach(session => {
      session.items.forEach(item => {
        if (item.actualStock === null || item.actualStock === undefined) return;
        
        totalItemsAudited++;
        const cost = item.ingredient?.cost || 0;
        const diff = item.difference || 0;
        const diffVal = item.differenceValue || 0;

        netValueDifference += diffVal;
        totalValueDifference += Math.abs(diffVal);

        const id = item.ingredientId;
        if (!ingredientLossMap[id]) {
          ingredientLossMap[id] = {
            name: item.ingredient?.name || "Unknown",
            unit: item.ingredient?.unit || "",
            lossQty: 0,
            gainQty: 0,
            lossVal: 0,
            gainVal: 0,
            cost: cost,
          };
        }

        if (diff < 0) {
          ingredientLossMap[id].lossQty += Math.abs(diff);
          ingredientLossMap[id].lossVal += Math.abs(diffVal);
        } else if (diff > 0) {
          ingredientLossMap[id].gainQty += diff;
          ingredientLossMap[id].gainVal += diffVal;
        }

        const reason = item.reason || "أخرى";
        if (reasonStats[reason]) {
          reasonStats[reason].count++;
          reasonStats[reason].value += Math.abs(diffVal);
        } else {
          reasonStats[reason] = { count: 1, value: Math.abs(diffVal) };
        }
      });
    });

    // Convert map to arrays
    const ingredientLossList = Object.values(ingredientLossMap);

    // Sort by Loss Value to find top losses
    const topLossIngredients = [...ingredientLossList]
      .filter(x => x.lossVal > 0)
      .sort((a, b) => b.lossVal - a.lossVal)
      .slice(0, 5);

    // Sort by Gain Value to find top gains
    const topGainIngredients = [...ingredientLossList]
      .filter(x => x.gainVal > 0)
      .sort((a, b) => b.gainVal - a.gainVal)
      .slice(0, 5);

    // Format stats for consumption reasons
    const formattedReasonStats = Object.entries(reasonStats).map(([reason, stats]) => ({
      reason,
      count: stats.count,
      value: parseFloat(stats.value.toFixed(2)),
    }));

    res.json({
      totalSessionsCompleted: sessions.length,
      totalItemsAudited,
      netValueDifference: parseFloat(netValueDifference.toFixed(2)),
      totalValueDifference: parseFloat(totalValueDifference.toFixed(2)),
      topLossIngredients,
      topGainIngredients,
      reasonStats: formattedReasonStats,
    });
  } catch (error: any) {
    res.status(500).json({ message: "فشل في إنشاء تقرير جرد المخازن", error: error.message });
  }
});

/**
 * GET /api/inventory-counts
 * Fetch all sessions
 */
router.get("/", authenticate, async (req, res) => {
  try {
    const list = await prisma.inventoryCountSession.findMany({
      orderBy: { countDate: "desc" },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: { items: true },
        },
      }
    });
    res.json(list);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch count sessions", error: error.message });
  }
});

/**
 * GET /api/inventory-counts/:id
 * Get details of a single session
 */
router.get("/:id", authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const session = await prisma.inventoryCountSession.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        items: {
          include: {
            ingredient: true,
          },
        },
        snapshots: true,
      },
    });

    if (!session) {
      return res.status(404).json({ message: "جلسة الجرد غير موجودة" });
    }

    res.json(session);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to fetch session details", error: error.message });
  }
});

/**
 * POST /api/inventory-counts
 * Open a new count session
 */
router.post("/", authenticate, authorize(["inventory:count:create"]), async (req, res) => {
  try {
    const { name, countDate } = req.body;
    if (!name) {
      return res.status(400).json({ message: "اسم جلسة الجرد مطلوب" });
    }

    const userId = (req as any).user.id;

    // Check if there is already an active session (Draft or InProgress)
    const existingActiveSession = await prisma.inventoryCountSession.findFirst({
      where: {
        status: {
          in: ["Draft", "InProgress"]
        }
      }
    });

    if (existingActiveSession) {
      return res.status(400).json({
        message: `عذراً، يرجى إنهاء جلسة الجرد النشطة حالياً ("${existingActiveSession.name}") أولاً كـ (مكتملة) أو (إلغائها) قبل البدء بجلسة جديدة.`
      });
    }

    // Fetch all active ingredients to capture their snapshot of expected stock
    const ingredients = await prisma.ingredient.findMany({});

    if (ingredients.length === 0) {
      return res.status(400).json({ message: "لا توجد مواد أو مكونات في المستودع لإجراء الجرد عليها" });
    }

    const session = await prisma.$transaction(async (tx) => {
      // 1. Create the session
      const newSession = await tx.inventoryCountSession.create({
        data: {
          name,
          countDate: countDate ? new Date(countDate) : new Date(),
          status: "Draft",
          userId,
        },
      });

      // 2. Map all ingredients into initial draft items
      const itemsData = ingredients.map((ing) => ({
        sessionId: newSession.id,
        ingredientId: ing.id,
        expectedStock: ing.currentStock,
        actualStock: null, // to be populated
        difference: null,
        differenceValue: null,
        reason: null,
        notes: null,
      }));

      await tx.inventoryCountItem.createMany({
        data: itemsData,
      });

      // 3. Log Audit Trail
      await logActivity(tx, userId, "Create Count Session", `بدء جلسة جرد جديدة باسم: "${name}" لعدد ${ingredients.length} مكونات.`);
      
      return newSession;
    });

    // Notify users
    await createNotification(prisma, userId, "بدء عملية جرد جديدة", `تم فتح جلسة الجرد [${name}] بواسطة ${(req as any).user.name || 'المدير'}.`, "Info");

    res.status(211).json(session);
  } catch (error: any) {
    res.status(500).json({ message: "Failed to start count session", error: error.message });
  }
});

/**
 * PUT /api/inventory-counts/:id
 * Update drafts/quantities of an in-progress session
 */
router.put("/:id", authenticate, authorize(["inventory:count:edit"]), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, items } = req.body; // items is array of { itemId, actualStock, reason, notes }

    const session = await prisma.inventoryCountSession.findUnique({
      where: { id },
      include: { items: true },
    });

    if (!session) {
      return res.status(404).json({ message: "جلسة الجرد غير موجودة" });
    }

    if (session.status === "Completed" || session.status === "Cancelled") {
      return res.status(400).json({ message: "لا يمكن تعديل جلسة جرد مكتملة أو ملغية" });
    }

    const userId = (req as any).user.id;

    const updatedSession = await prisma.$transaction(async (tx) => {
      // 1. If status is updated to e.g. "InProgress"
      const nextStatus = status || session.status;

      // 2. Update individual count items
      if (items && Array.isArray(items)) {
        for (const itemUpdate of items) {
          const { itemId, actualStock, reason, notes } = itemUpdate;
          if (!itemId) continue;

          const existingItem = session.items.find(it => it.id === itemId);
          if (!existingItem) continue;

          // Compute difference inside the safe transaction
          let difference: number | null = null;
          let differenceValue: number | null = null;

          if (actualStock !== null && actualStock !== undefined) {
            const parsedActual = parseFloat(actualStock);
            if (isNaN(parsedActual) || parsedActual < 0) {
              throw new Error("الكميات الفعلية المدخلة للجرد لا يمكن أن تكون أقل من الصفر");
            }

            // Fetch the recipe/ingredient cost
            const ing = await tx.ingredient.findUnique({ where: { id: existingItem.ingredientId } });
            const cost = ing?.cost || 0;

            difference = parsedActual - existingItem.expectedStock;
            differenceValue = difference * cost;

            await tx.inventoryCountItem.update({
              where: { id: itemId },
              data: {
                actualStock: parsedActual,
                difference: parseFloat(difference.toFixed(4)),
                differenceValue: parseFloat(differenceValue.toFixed(4)),
                reason: reason || existingItem.reason,
                notes: notes !== undefined ? notes : existingItem.notes,
              }
            });
          } else {
            await tx.inventoryCountItem.update({
              where: { id: itemId },
              data: {
                reason: reason || existingItem.reason,
                notes: notes !== undefined ? notes : existingItem.notes,
              }
            });
          }
        }
      }

      // Update session main details
      const output = await tx.inventoryCountSession.update({
        where: { id },
        data: {
          status: nextStatus,
        },
        include: {
          items: {
            include: { ingredient: true }
          }
        }
      });

      await logActivity(tx, userId, "Update Count Session", `تم حفظ تعديلات على مسودة الجرد [${session.name}]`);

      return output;
    });

    res.json(updatedSession);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * POST /api/inventory-counts/:id/commit
 * Commit the physical audit and apply adjustments atomically
 */
router.post("/:id/commit", authenticate, authorize(["inventory:count:commit"]), async (req, res) => {
  try {
    const { id } = req.params;
    const session = await prisma.inventoryCountSession.findUnique({
      where: { id },
      include: {
        items: {
          include: { ingredient: true }
        }
      },
    });

    if (!session) {
      return res.status(404).json({ message: "جلسة الجرد غير موجودة" });
    }

    if (session.status === "Completed") {
      return res.status(400).json({ message: "هذا الجرد تم اعتماده بالفعل سابقاً" });
    }

    if (session.status === "Cancelled") {
      return res.status(400).json({ message: "لا يمكن اعتماد جرد ملغي" });
    }

    const userId = (req as any).user.id;
    const adminName = (req as any).user.name || "المدير";

    // Ensure all items have actual stock values
    const unenteredItems = session.items.filter(it => it.actualStock === null || it.actualStock === undefined);
    if (unenteredItems.length > 0) {
      return res.status(400).json({ message: `برجاء إدخال الكميات الفعلية لجميع المواد قبل الاعتماد. متبقي ${unenteredItems.length} مواد غير مجرودة.` });
    }

    let absoluteDiscrepancySum = 0;
    let largeDiscrepancyIssues: string[] = [];

    // Run the massive atomic operation
    await prisma.$transaction(async (tx) => {
      for (const item of session.items) {
        const actual = item.actualStock!;
        const expected = item.expectedStock;
        const diff = actual - expected;
        const beforeQty = expected;
        const afterQty = actual;

        // 1. Update ingredient current stock to actual
        const ingredient = await tx.ingredient.findUnique({
          where: { id: item.ingredientId }
        });

        if (!ingredient) continue;

        await tx.ingredient.update({
          where: { id: item.ingredientId },
          data: { currentStock: actual }
        });

        // 2. Record inventory transaction if there's any discrepancy
        if (Math.abs(diff) > 0.0001) {
          const type = diff > 0 ? "Adjustment" : "Wastage";
          const reasonAr = item.reason || "غير محدد";
          const noteText = `جرد فعلي معتمد - جلسة [${session.name}]. السبب: ${reasonAr} | ملاحظات: ${item.notes || "لا يوجد"}`;

          await tx.inventoryTransaction.create({
            data: {
              ingredientId: item.ingredientId,
              type,
              quantity: parseFloat(diff.toFixed(4)),
              beforeQty,
              afterQty,
              note: noteText,
              userId,
            }
          });

          // Check if difference value is highly significant
          const cost = ingredient.cost || 0;
          const diffValue = Math.abs(diff * cost);
          absoluteDiscrepancySum += diffValue;

          // Flag discrepancy if difference exceeds 20% of expected, or value > 50 SAR/USD
          const pct = expected > 0 ? (Math.abs(diff) / expected) * 100 : 100;
          if (pct >= 20 || diffValue >= 50) {
            largeDiscrepancyIssues.push(`فارق في [${ingredient.name}]: المتوقع ${expected} والفعلي ${actual}. فارق قيمة ${diffValue.toFixed(2)}.`);
          }
        }

        // 3. Create snapshot record for the ingredient
        await tx.inventoryCountSnapshot.create({
          data: {
            sessionId: session.id,
            ingredientId: item.ingredientId,
            ingredientName: ingredient.name,
            unit: ingredient.unit,
            expectedStock: beforeQty,
            actualStock: afterQty,
            cost: ingredient.cost,
            valueDifference: parseFloat((diff * (ingredient.cost || 0)).toFixed(4)),
          }
        });
      }

      // Mark session as completed
      await tx.inventoryCountSession.update({
        where: { id },
        data: {
          status: "Completed",
          countDate: new Date(),
        },
      });

      // Log transaction
      await logActivity(tx, userId, "Commit Count Session", `تم اعتماد ومطابقة الجرد الفعلي باسم [${session.name}]. إجمالي قيمة الفروق المكتشفة: ${absoluteDiscrepancySum.toFixed(2)}`);

      // If high discrepancy, dispatch immediate alert notification
      if (largeDiscrepancyIssues.length > 0) {
        await createNotification(
          tx,
          userId,
          "🚨 تنبيه فروقات جرد كبرى",
          `تم رصد فروقات تجاوزت حد الأمان عند اعتماد جرد [${session.name}]: ${largeDiscrepancyIssues.slice(0, 3).join(" | ")}`,
          "Alert"
        );
      } else {
        await createNotification(
          tx,
          userId,
          "تم إعتماد الجرد بنجاح",
          `تم إعتماد الجرد الفعلي ومطابقة المستودعات مع جلسة [${session.name}] بنجاح بدون تنبيهات فروق خانقة.`,
          "Info"
        );
      }
    });

    res.json({ success: true, message: "تم اعتماد الجرد وتعديل مخزون المستودعات بالكامل!" });
  } catch (error: any) {
    res.status(500).json({ message: "فشل في اعتماد وترحيل فروقات الجرد الفعلي", error: error.message });
  }
});

/**
 * POST /api/inventory-counts/:id/cancel
 * Cancel the active session
 */
router.post("/:id/cancel", authenticate, authorize(["inventory:count:cancel"]), async (req, res) => {
  try {
    const { id } = req.params;
    const session = await prisma.inventoryCountSession.findUnique({
      where: { id },
    });

    if (!session) {
      return res.status(404).json({ message: "جلسة الجرد غير موجودة" });
    }

    if (session.status === "Completed") {
      return res.status(400).json({ message: "لا يمكن إلغاء جلسة جرد مكتملة ومعتمدة بالفعل" });
    }

    if (session.status === "Cancelled") {
      return res.status(400).json({ message: "الجلسة ملغية بالفعل سابقاً" });
    }

    const userId = (req as any).user.id;

    await prisma.$transaction(async (tx) => {
      await tx.inventoryCountSession.update({
        where: { id },
        data: { status: "Cancelled" },
      });

      await logActivity(tx, userId, "Cancel Count Session", `تم إلغاء جلسة الجرد [${session.name}]`);
    });

    res.json({ success: true, message: "تم إلغاء عملية الجرد بنجاح" });
  } catch (error: any) {
    res.status(500).json({ message: "Failed to cancel count session", error: error.message });
  }
});

export default router;
