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
