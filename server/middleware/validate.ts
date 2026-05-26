import { Request, Response, NextFunction } from "express";
import { AnyZodObject, ZodError } from "zod";

export interface ValidationConfig {
  body?: AnyZodObject;
  query?: AnyZodObject;
  params?: AnyZodObject;
}

export const validate = (schema: ValidationConfig) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (schema.body) {
        // Zod's parse function strips any keys not defined in the schema!
        // This is highly effective at preventing mass assignment vulnerabilities.
        req.body = await schema.body.parseAsync(req.body);
      }
      if (schema.query) {
        req.query = await schema.query.parseAsync(req.query);
      }
      if (schema.params) {
        req.params = await schema.params.parseAsync(req.params);
      }
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          status: "error",
          message: "Validation failed: Invalid inputs provided",
          errors: error.errors.map((err) => ({
            field: err.path.join("."),
            message: err.message,
          })),
        });
      }
      return res.status(500).json({
        status: "error",
        message: "Internal validation processor error",
      });
    }
  };
};
