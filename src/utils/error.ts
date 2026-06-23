class AppError extends Error {
  statusCode: number;
  isOperational: boolean;
  data?: Record<string, unknown>;

  constructor(
    statusCode: number,
    message: string | undefined,
    data?: Record<string, unknown>,
    isOperational = true,
    stack = ""
  ) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    this.data = data;
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export { AppError };
