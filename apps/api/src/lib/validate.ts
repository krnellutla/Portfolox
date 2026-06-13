import type { NextFunction, Request, Response } from 'express';
import type { ZodSchema } from 'zod';
import { AppError } from './app-error.js';

interface ValidationSchemas {
  body?: ZodSchema;
  params?: ZodSchema;
  query?: ZodSchema;
}

/**
 * Validates req.body/params/query against Zod schemas, replacing each with
 * the parsed (and coerced) value. On failure, throws a VALIDATION_ERROR
 * AppError listing only field paths — never the submitted values, to avoid
 * reflecting PII back through error responses/logs.
 */
export function validate(schemas: ValidationSchemas) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    for (const [key, schema] of Object.entries(schemas) as [
      keyof ValidationSchemas,
      ZodSchema | undefined,
    ][]) {
      if (!schema) continue;

      const result = schema.safeParse(req[key]);
      if (!result.success) {
        const fields = result.error.issues.map((issue) => issue.path.join('.') || '(root)');
        next(AppError.validation(`Invalid ${key}: ${fields.join(', ')}`));
        return;
      }

      req[key] = result.data;
    }

    next();
  };
}
