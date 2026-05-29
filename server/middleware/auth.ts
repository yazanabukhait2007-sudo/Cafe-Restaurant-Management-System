import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.ts";

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "your-access-token-secret-change-in-prod";

export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
    permissions: string[];
  };
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, ACCESS_SECRET) as any;
    
    // Fetch user and permissions dynamically from database to support live updates
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: { role: { include: { permissions: true } } },
    });

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    const permissions = user.role.permissions.map((p) => p.name);

    req.user = {
      id: user.id,
      role: user.role.name,
      permissions,
    };
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

export const authorize = (requiredPermissions: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const hasPermission = requiredPermissions.every((perm) =>
      req.user?.permissions.includes(perm)
    );

    if (!hasPermission) {
      return res.status(403).json({ message: "Forbidden: Insufficient permissions" });
    }

    next();
  };
};
