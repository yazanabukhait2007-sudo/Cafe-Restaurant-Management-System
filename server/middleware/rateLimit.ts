import { Request, Response, NextFunction } from "express";

interface RateLimitOption {
  windowMs: number;
  max: number;
  message?: string;
}

// Memory store for tracking request IP and counts
const ipStore = new Map<string, { count: number; resetTime: number }>();

// Simple periodic cleanup to prevent memory leaks from expired client records
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of ipStore.entries()) {
    if (now > record.resetTime) {
      ipStore.delete(key);
    }
  }
}, 5 * 60 * 1000).unref(); // Runs every 5 minutes and lets Node exit gracefully

export const rateLimit = (options: RateLimitOption) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // In many reverse-proxy setups, req.headers["x-forwarded-for"] contains the true client IP
    const forwardHeader = req.headers["x-forwarded-for"];
    const ip = (Array.isArray(forwardHeader) ? forwardHeader[0] : forwardHeader) ||
               req.socket.remoteAddress || 
               "anonymous-client";

    const key = `${req.baseUrl || ""}${req.path}:${ip}`;
    const now = Date.now();

    let record = ipStore.get(key);

    if (!record || now > record.resetTime) {
      // Create new window record
      record = {
        count: 1,
        resetTime: now + options.windowMs,
      };
      ipStore.set(key, record);
      return next();
    }

    record.count++;
    if (record.count > options.max) {
      return res.status(429).json({
        status: "error",
        message: options.message || "Too many attempts from this IP, please try again shortly.",
      });
    }

    next();
  };
};
