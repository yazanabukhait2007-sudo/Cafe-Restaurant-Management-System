import express from "express";
import path from "path";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import authRoutes from "./server/routes/auth.ts";
import menuRoutes from "./server/routes/menu.ts";
import tableRoutes from "./server/routes/tables.ts";
import orderRoutes from "./server/routes/orders.ts";
import inventoryRoutes from "./server/routes/inventory.ts";
import recipeRoutes from "./server/routes/recipes.ts";

dotenv.config();

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
    },
  });

  const PORT = 3000;

  app.use(express.json());

  // Socket.io setup
  io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    socket.on("join-room", (room) => {
      socket.join(room);
      console.log(`User ${socket.id} joined room: ${room}`);
    });

    // Realtime events
    socket.on("order.created", (data) => {
      console.log("[Server Socket] order.created received:", data?.ticket?.id);
      socket.broadcast.emit("order.created", data);
    });

    socket.on("order.updated", (data) => {
      console.log("[Server Socket] order.updated received:", data?.ticketId);
      socket.broadcast.emit("order.updated", data);
    });

    socket.on("order.status_changed", (data) => {
      console.log("[Server Socket] order.status_changed received:", data?.ticketId, data?.status);
      socket.broadcast.emit("order.status_changed", data);
    });

    socket.on("table.updated", (data) => {
      console.log("[Server Socket] table.updated received:", data?.tableId);
      socket.broadcast.emit("table.updated", data);
    });

    socket.on("payment.completed", (data) => {
      console.log("[Server Socket] payment.completed received:", data?.entry?.id);
      socket.broadcast.emit("payment.completed", data);
    });

    socket.on("kitchen.updated", (data) => {
      console.log("[Server Socket] kitchen.updated received:", data?.ticketId, data?.itemIdx, data?.completed);
      socket.broadcast.emit("kitchen.updated", data);
    });

    // Retro-compatibility legacy event
    socket.on("order-created", (order) => {
      io.to("kitchen").emit("new-order", order);
      io.to("waiter").emit("order-status-update", order);
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });

  // Auth routes
  app.use("/api/auth", authRoutes);
  app.use("/api/menu", menuRoutes);
  app.use("/api/tables", tableRoutes);
  app.use("/api/orders", orderRoutes);
  app.use("/api/inventory", inventoryRoutes);
  app.use("/api/recipes", recipeRoutes);

  // API Routes (Phase 2 will implement these)
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Auth routes placeholder
  // app.use("/api/auth", authRoutes);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      root: path.join(process.cwd(), "frontend"),
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "frontend", "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
