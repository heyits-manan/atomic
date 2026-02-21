import { Request, Response, NextFunction } from "express";
import z, { ZodError } from "zod";
import { BadRequestError } from "../../lib/errors";

function formatZodErrors(issues: z.core.$ZodIssue[]): string {
    return issues
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join("; ");
}

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
