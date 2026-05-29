import { z } from "zod";

// Helper for validating CUID or generic UUID/String IDs
const idSchema = z.string().min(1, "ID is required").max(50, "ID is too long");

// ----------------- 1. AUTH SCHEMAS -----------------
export const loginSchema = z.object({
  email: z.string().email("Invalid email address").min(5, "Email is too short").max(100, "Email is too long"),
  password: z.string().min(6, "Password must be at least 6 characters").max(100, "Password is too long"),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(20, "Refresh token is too short").max(500, "Refresh token is too long"),
});

// ----------------- 2. ORDER SCHEMAS -----------------
export const orderItemSchema = z.object({
  productId: idSchema,
  productVariantId: z.string().max(50).nullable().optional(),
  quantity: z.number().int("Quantity must be an integer").positive("Quantity must be greater than zero"),
  notes: z.string().max(500, "Notes are too long").nullable().optional(),
});

export const createOrderSchema = z.object({
  tableId: z.string().max(50).nullable().optional(),
  type: z.enum(["DineIn", "Takeaway", "Delivery"]).default("DineIn"),
  status: z.enum(["DRAFT", "CONFIRMED"]).default("CONFIRMED"),
  notes: z.string().max(1000, "Notes are too long").nullable().optional(),
  items: z.array(orderItemSchema).min(1, "Order must contain at least one item"),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(["DRAFT", "CONFIRMED", "PREPARING", "READY", "SERVED", "PAID", "CLOSED", "CANCELLED"]),
  notes: z.string().max(500, "Notes are too long").optional(),
});

// ----------------- 3. TABLE SCHEMAS -----------------
export const createTableSchema = z.object({
  number: z.string().min(1, "Table number is required").max(10, "Table description is too long"),
  capacity: z.number().int().positive("Capacity must be greater than zero"),
});

export const updateTableStatusSchema = z.object({
  status: z.enum(["Available", "Occupied", "Reserved", "Cleaning"]),
});

// ----------------- 4. EMPLOYEE SCHEMAS -----------------
export const createEmployeeSchema = z.object({
  userId: idSchema,
  position: z.string().min(1, "Position is required").max(50, "Position is too long"),
  hourlyRate: z.number().positive("Hourly rate must be a positive number"),
  hireDate: z.coerce.date().optional(),
});

// ----------------- 5. INVENTORY SCHEMAS -----------------
export const createCategorySchema = z.object({
  name: z.string().min(1, "Name is required").max(50, "Name is too long"),
  image: z.string().url("Invalid image URL").nullable().optional().or(z.string().max(255).optional()),
});

export const createProductVariantSchema = z.object({
  name: z.string().min(1, "Variant name is required").max(30, "Variant name is too long"),
  price: z.number().nonnegative("Variant price must be zero or a positive number"),
});

export const createProductSchema = z.object({
  categoryId: idSchema.optional().nullable(),
  categoryName: z.string().optional().nullable(),
  name: z.string().min(1, "Product name is required").max(100, "Product name is too long"),
  description: z.string().max(500, "Description is too long").nullable().optional(),
  price: z.number().nonnegative("Price must be a positive number"),
  image: z.string().max(20000).nullable().optional().or(z.string().url().optional()), // Support base64 or text images from client
  variants: z.array(createProductVariantSchema).optional(),
});

export const createIngredientSchema = z.object({
  name: z.string().min(1, "Ingredient name is required").max(100, "Name is too long"),
  unit: z.string().min(1, "Unit is required").max(20, "Unit is too long"),
  currentStock: z.number().nonnegative("Current stock cannot be negative").default(0),
  lowStockLevel: z.number().nonnegative("Low stock level cannot be negative").default(10),
});

export const createInventoryTransactionSchema = z.object({
  ingredientId: idSchema.optional().nullable(),
  type: z.enum(["Purchase", "Consumption", "Wastage", "Adjustment"]),
  quantity: z.number().positive("Quantity must be a positive number"),
  note: z.string().max(500, "Transaction note is too long").nullable().optional(),
});

// ----------------- 6. PAYMENT SCHEMAS -----------------
export const createPaymentSchema = z.object({
  orderId: idSchema,
  amount: z.number().positive("Amount must be a positive number"),
  method: z.enum(["Cash", "Card"]),
  status: z.enum(["Completed", "Refunded"]).default("Completed"),
  transactionId: z.string().max(100).nullable().optional(),
});

// ----------------- 7. COUPON SCHEMAS -----------------
export const createCouponSchema = z.object({
  code: z.string().min(2, "Code must be at least 2 chars").max(20, "Code is too long").toUpperCase(),
  discountType: z.enum(["Percentage", "FixedAmount"]),
  discountValue: z.number().positive("Discount value must be a positive number"),
  minOrderAmount: z.number().nonnegative().nullable().optional(),
  maxDiscount: z.number().nonnegative().nullable().optional(),
  expiryDate: z.coerce.date(),
  usageLimit: z.number().int().positive().nullable().optional(),
});

// ----------------- 8. RESERVATION SCHEMAS -----------------
export const createReservationSchema = z.object({
  tableId: idSchema,
  customerName: z.string().min(1, "Customer name is required").max(100, "Customer name is too long"),
  customerPhone: z.string().min(5, "Contact number is required").max(20, "Contact number is too long"),
  startTime: z.coerce.date(),
  endTime: z.coerce.date().nullable().optional(),
  status: z.enum(["Pending", "Confirmed", "Completed", "Cancelled"]).default("Pending"),
});

// ----------------- 9. ATTENDANCE SCHEMAS -----------------
export const createAttendanceSchema = z.object({
  employeeId: idSchema,
  clockIn: z.coerce.date().default(() => new Date()),
  clockOut: z.coerce.date().nullable().optional(),
});

// ----------------- 10. SETTINGS SCHEMAS -----------------
export const createOrUpdateSettingSchema = z.object({
  key: z.string().min(1, "Setting key is required").max(100, "Setting key is too long"),
  value: z.string().max(1000, "Setting value is too long"),
  group: z.enum(["System", "Cafe", "UI", "Finance"]).default("System"),
});
