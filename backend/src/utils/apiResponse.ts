import { Response } from 'express';
import { ApiResponse, ApiError, HttpStatus, ErrorCode } from '../types/api';

/**
 * API Response Utilities
 * Standardized response formatting
 */

/**
 * Send success response
 */
export function sendSuccess<T>(
  res: Response,
  data: T,
  status: HttpStatus = HttpStatus.OK
): Response {
  const response: ApiResponse<T> = {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
    },
  };
  return res.status(status).json(response);
}

/**
 * Send error response
 */
export function sendError(
  res: Response,
  code: ErrorCode,
  message: string,
  status: HttpStatus = HttpStatus.BAD_REQUEST,
  details?: any
): Response {
  const error: ApiError = {
    code,
    message,
    details,
    timestamp: new Date().toISOString(),
  };

  const response: ApiResponse = {
    success: false,
    error,
    meta: {
      timestamp: new Date().toISOString(),
    },
  };

  return res.status(status).json(response);
}

/**
 * Send rate limit exceeded error
 */
export function sendRateLimitError(
  res: Response,
  message: string,
  retryAfter?: number
): Response {
  if (retryAfter) {
    res.setHeader('Retry-After', retryAfter.toString());
  }

  return sendError(
    res,
    ErrorCode.RATE_LIMIT_EXCEEDED,
    message,
    HttpStatus.TOO_MANY_REQUESTS,
    { retryAfter }
  );
}

/**
 * Send spam detected error
 */
export function sendSpamError(
  res: Response,
  message: string,
  details?: any
): Response {
  return sendError(
    res,
    ErrorCode.SPAM_DETECTED,
    message,
    HttpStatus.FORBIDDEN,
    details
  );
}

/**
 * Send validation error
 */
export function sendValidationError(
  res: Response,
  message: string,
  details?: any
): Response {
  return sendError(
    res,
    ErrorCode.INVALID_REQUEST,
    message,
    HttpStatus.BAD_REQUEST,
    details
  );
}

/**
 * Send internal server error
 */
export function sendInternalError(
  res: Response,
  message: string = 'Internal server error'
): Response {
  return sendError(
    res,
    ErrorCode.INTERNAL_ERROR,
    message,
    HttpStatus.INTERNAL_SERVER_ERROR
  );
}
