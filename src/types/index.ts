import { Request, Response, NextFunction } from "express";
import { ParamsDictionary } from "express-serve-static-core";

/**
 * Standard API success response envelope.
 */
export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: {
        message: string;
        code?: string;
    };
    meta?: {
        requestId?: string;
        timestamp: string;
    };
}

/**
 * Typed request with validated body, params, and query.
 */
export interface TypedRequest<
    TBody = unknown,
    TParams extends ParamsDictionary = ParamsDictionary,
    TQuery = Record<string, string>
> extends Request {
    body: TBody;
    params: TParams;
    query: TQuery & Request["query"];
}

/**
 * Express async handler wrapper type.
 */
export type AsyncHandler = (
    req: Request,
    res: Response,
    next: NextFunction
) => Promise<void>;

/**
 * Pagination query parameters.
 */
export interface PaginationParams {
    page: number;
    limit: number;
    offset: number;
}

/**
 * Paginated response shape.
 */
export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}
