import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.ts";

const router = express.Router();

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "your-access-token-secret-change-in-prod";
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "your-refresh-token-secret-change-in-prod";

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { role: { include: { permissions: true } } },
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const permissions = user.role.permissions.map((p) => p.name);

    const accessToken = jwt.sign(
      { id: user.id, role: user.role.name, permissions },
      ACCESS_SECRET,
      { expiresIn: "15m" }
    );

    const refreshToken = jwt.sign(
      { id: user.id },
      REFRESH_SECRET,
      { expiresIn: "7d" }
    );

    // Store refresh token in DB
    await prisma.session.create({
      data: {
        userId: user.id,
        refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    // Activity log
    await prisma.activityLog.create({
      data: {
        userId: user.id,
        action: "Login",
        module: "Auth",
        details: `User ${user.email} logged in.`,
      },
    });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role.name,
        permissions,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post("/refresh", async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) return res.status(400).json({ message: "Refresh token required" });

  try {
    const session = await prisma.session.findUnique({
      where: { refreshToken },
      include: { user: { include: { role: { include: { permissions: true } } } } },
    });

    if (!session || session.expiresAt < new Date()) {
      return res.status(401).json({ message: "Invalid or expired refresh token" });
    }

    const decoded = jwt.verify(refreshToken, REFRESH_SECRET) as any;
    if (decoded.id !== session.userId) {
      return res.status(401).json({ message: "Invalid token" });
    }

    const permissions = session.user.role.permissions.map((p) => p.name);

    const accessToken = jwt.sign(
      { id: session.user.id, role: session.user.role.name, permissions },
      ACCESS_SECRET,
      { expiresIn: "15m" }
    );

    res.json({ accessToken });
  } catch (error) {
    res.status(401).json({ message: "Invalid token" });
  }
});

router.post("/logout", async (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    await prisma.session.deleteMany({ where: { refreshToken } });
  }
  res.json({ message: "Logged out" });
});

export default router;
