export class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function errorHandler(err, req, res, next) {
  let error = { ...err };
  error.message = err.message;

  console.error({
    type: 'error',
    message: err.message,
    stack: err.stack,
    statusCode: err.statusCode,
    code: err.code,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  if (err.name === 'ValidationError') {
    const message = 'Invalid input data';
    error = new AppError(message, 400, 'VALIDATION_ERROR');
  }

  if (err.name === 'CastError') {
    const message = 'Resource not found';
    error = new AppError(message, 404, 'NOT_FOUND');
  }

  res.status(error.statusCode || 500).json({
    error: error.code || 'INTERNAL_ERROR',
    message: error.message || 'Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
}

export function notFoundHandler(req, res, next) {
  const error = new AppError(`Route ${req.originalUrl} not found`, 404, 'NOT_FOUND');
  next(error);
}