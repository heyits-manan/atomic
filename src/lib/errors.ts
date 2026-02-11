/**
 * Base application error with HTTP status code.
 */
export class AppError extends Error {
    public readonly statusCode: number;
    public readonly isOperational: boolean;

    constructor(message: string, statusCode = 500, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        Object.setPrototypeOf(this, new.target.prototype);
        Error.captureStackTrace(this, this.constructor);
    }
}

export class BadRequestError extends AppError {
    constructor(message = "Bad Request") {
        super(message, 400);
    }
}

export class UnauthorizedError extends AppError {
    constructor(message = "Unauthorized") {
        super(message, 401);
    }
}

export class ForbiddenError extends AppError {
    constructor(message = "Forbidden") {
        super(message, 403);
    }
}

export class NotFoundError extends AppError {
    constructor(message = "Resource Not Found") {
        super(message, 404);
    }
}

export class ConflictError extends AppError {
    constructor(message = "Conflict") {
        super(message, 409);
    }
}

export class UnprocessableEntityError extends AppError {
    constructor(message = "Unprocessable Entity") {
        super(message, 422);
    }
}

export class TooManyRequestsError extends AppError {
    constructor(message = "Too Many Requests") {
        super(message, 429);
    }
}

export class InternalServerError extends AppError {
    constructor(message = "Internal Server Error") {
        super(message, 500, false);
    }
}

export class InsufficientBalanceError extends AppError {
    constructor(message = "Insufficient Balance") {
        super(message, 422);
    }
}

export class CurrencyMismatchError extends AppError {
    constructor(message = "Currency Mismatch") {
        super(message, 422);
    }
}
