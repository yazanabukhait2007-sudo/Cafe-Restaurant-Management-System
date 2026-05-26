import { prisma } from "./prisma.ts";

export type OrderStatus =
  | "DRAFT"
  | "CONFIRMED"
  | "PREPARING"
  | "READY"
  | "SERVED"
  | "PAID"
  | "CLOSED"
  | "CANCELLED";

// Map of allowed origin -> destination states
export const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  DRAFT: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PREPARING", "READY", "PAID", "CANCELLED"],
  PREPARING: ["READY", "CANCELLED"],
  READY: ["SERVED", "PAID", "CANCELLED"],
  SERVED: ["PAID", "CANCELLED"],
  PAID: ["CLOSED"],
  CLOSED: [],
  CANCELLED: [],
};

// Map of which role is allowed to trigger which target state
// Note: Owner and Manager are allowed to perform any transition
export const ROLE_TRANSITIONS: Record<string, OrderStatus[]> = {
  Waiter: ["CONFIRMED", "SERVED", "CANCELLED"],
  Kitchen: ["PREPARING", "READY"],
  Cashier: ["CONFIRMED", "PREPARING", "READY", "SERVED", "PAID", "CLOSED", "CANCELLED"],
  Manager: ["DRAFT", "CONFIRMED", "PREPARING", "READY", "SERVED", "PAID", "CLOSED", "CANCELLED"],
  Owner: ["DRAFT", "CONFIRMED", "PREPARING", "READY", "SERVED", "PAID", "CLOSED", "CANCELLED"],
};

export interface TransitionResult {
  success: boolean;
  message: string;
  order?: any;
}

/**
 * Validates and process an Order state transition safely inside a Prisma transaction
 * to prevent race conditions and enforce role/status rule matrices.
 */
export async function processOrderTransition(
  orderId: string,
  targetStatus: OrderStatus,
  userId: string,
  userRoleName: string, // Role name (e.g., "Waiter", "Kitchen", "Cashier", "Manager", "Owner")
  notes?: string
): Promise<TransitionResult> {
  // 1. Perform transaction to ensure concurrent updates are held safe
  return await prisma.$transaction(async (tx) => {
    // Fetch the order with current status & table
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { table: true },
    });

    if (!order) {
      return { success: false, message: `Order #${orderId} was not found.` };
    }

    const currentStatus = order.status as OrderStatus;

    // A. Check if they are try to apply the same status
    if (currentStatus === targetStatus) {
      return { success: true, message: `Order is already in ${targetStatus} status.`, order };
    }

    // B. Validate origin -> destination transition
    const allowedTargets = VALID_TRANSITIONS[currentStatus] || [];
    if (!allowedTargets.includes(targetStatus)) {
      return {
        success: false,
        message: `Invalid state transition: Cannot change order status from ${currentStatus} to ${targetStatus}.`,
      };
    }

    // C. Validate user role permissions for the target status transition
    // Standardize role name format to match keys in ROLE_TRANSITIONS
    const standardizedRole = userRoleName.trim();
    const allowedRolesForTarget = ROLE_TRANSITIONS[standardizedRole] || [];
    if (
      standardizedRole !== "Owner" && 
      standardizedRole !== "Manager" && 
      !allowedRolesForTarget.includes(targetStatus)
    ) {
      return {
        success: false,
        message: `Unauthorized transition: Role '${userRoleName}' is not allowed to transition orders to status '${targetStatus}'.`,
      };
    }

    // Determine target timestamp column name in prisma
    const updateData: any = {
      status: targetStatus,
    };

    // Calculate timestamps to set
    const now = new Date();
    if (targetStatus === "CONFIRMED") updateData.confirmedAt = now;
    else if (targetStatus === "PREPARING") updateData.preparingAt = now;
    else if (targetStatus === "READY") updateData.readyAt = now;
    else if (targetStatus === "SERVED") updateData.servedAt = now;
    else if (targetStatus === "PAID") updateData.paidAt = now;
    else if (targetStatus === "CLOSED") updateData.closedAt = now;
    else if (targetStatus === "CANCELLED") updateData.cancelledAt = now;

    // D. Safely free up or lock tables depending on state
    if (targetStatus === "CLOSED" || targetStatus === "CANCELLED") {
      if (order.tableId) {
        await tx.table.update({
          where: { id: order.tableId },
          data: { status: "Available" },
        });
      }
    } else if (order.tableId && ["CONFIRMED", "PREPARING", "READY", "SERVED"].includes(targetStatus)) {
      await tx.table.update({
        where: { id: order.tableId },
        data: { status: "Occupied" },
      });
    }

    // E. Save order modifications
    const updatedOrder = await tx.order.update({
      where: { id: orderId },
      data: updateData,
      include: {
        items: { include: { product: true } },
        table: true,
      },
    });

    // F. Append to OrderStatusHistory logging
    await tx.orderStatusHistory.create({
      data: {
        orderId,
        fromStatus: currentStatus,
        toStatus: targetStatus,
        userId,
        notes: notes || `Status changed from ${currentStatus} to ${targetStatus}`,
      },
    });

    // G. Create an activity log record for accountability
    await tx.activityLog.create({
      data: {
        userId,
        action: "Order Status Transitioned",
        module: "Orders",
        details: `Order #${orderId} moved from ${currentStatus} to ${targetStatus} by user #${userId} (${userRoleName}).`,
      },
    });

    return {
      success: true,
      message: `Successfully transitioned Order #${orderId} from ${currentStatus} to ${targetStatus}.`,
      order: updatedOrder,
    };
  });
}
