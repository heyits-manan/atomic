import { Request, Response, NextFunction } from "express";
import z, { ZodError } from "zod";
import { BadRequestError } from "../../lib/errors";

/**
 * Format Zod issues into a human-readable error string.
 */
function formatZodErrors(issues: z.core.$ZodIssue[]): string {
    return issues
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join("; ");
}

/**
 * Middleware factory that validates `req.body` against a Zod schema.
 * Returns 400 with structured validation errors on failure.
 */
export function validateBody(schema: z.ZodType) {
    return (req: Request, _res: Response, next: NextFunction): void => {
        try {
            req.body = schema.parse(req.body);
            next();
        } catch (err) {
            if (err instanceof ZodError) {
                next(new BadRequestError(`Validation failed — ${formatZodErrors(err.issues)}`));
                return;
            }
            next(err);
        }
    };
}

/**
 * Middleware factory that validates `req.params` against a Zod schema.
 */
export function validateParams(schema: z.ZodType) {
    return (req: Request, _res: Response, next: NextFunction): void => {
        try {
            req.params = schema.parse(req.params) as Request["params"];
            next();
        } catch (err) {
            if (err instanceof ZodError) {
                next(new BadRequestError(`Validation failed — ${formatZodErrors(err.issues)}`));
                return;
            }
            next(err);
        }
    };
}

/**
 * Middleware factory that validates `req.query` against a Zod schema.
 */
export function validateQuery(schema: z.ZodType) {
    return (req: Request, _res: Response, next: NextFunction): void => {
        try {
            req.query = schema.parse(req.query) as Request["query"];
            next();
        } catch (err) {
            if (err instanceof ZodError) {
                next(new BadRequestError(`Validation failed — ${formatZodErrors(err.issues)}`));
                return;
            }
            next(err);
        }
    };
}
