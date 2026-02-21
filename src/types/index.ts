import { Request, Response, NextFunction } from "express";
import { ParamsDictionary } from "express-serve-static-core";

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

export interface TypedRequest<
    TBody = unknown,
    TParams extends ParamsDictionary = ParamsDictionary,
    TQuery = Record<string, string>
> extends Request {
    body: TBody;
    params: TParams;
    query: TQuery & Request["query"];
}

export type AsyncHandler = (
    req: Request,
    res: Response,
    next: NextFunction
) => Promise<void>;

export interface PaginationParams {
    page: number;
    limit: number;
    offset: number;
}

export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}
