import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export const ERROR_STATUS_MAP = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  WEBHOOK_SIGNATURE_INVALID: 401,
  FORBIDDEN_ROLE: 403,
  FORBIDDEN_OWNERSHIP: 403,
  NOT_FOUND: 404,
  QUOTA_EXCEEDED: 409,
  ACTIVE_ORDER_EXISTS: 409,
  TICKET_ALREADY_USED: 409,
  ORDER_EXPIRED: 410,
  SALE_WINDOW_CLOSED: 422,
  MAX_ORDER_LIMIT_EXCEEDED: 422,
  CATEGORY_LOCKED: 422,
  INVALID_STATE_TRANSITION: 422,
  QR_SIGNATURE_INVALID: 422,
  TICKET_WRONG_EVENT: 422,
   APP_UPDATE_REQUIRED: 426,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
} as const;

export type ErrorCode = keyof typeof ERROR_STATUS_MAP;

export interface ApiMeta {
  page?: number;
  limit?: number;
  total?: number;
  [key: string]: unknown;
}

export interface ApiSuccessEnvelope<T> {
  success: true;
  data: T;
  meta?: ApiMeta;
}

export interface ApiErrorEnvelope {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: Record<string, unknown>;
  };
}

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;

  constructor(
    code: ErrorCode,
    message: string,
    details?: Record<string, unknown>,
    statusCodeOverride?: number
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCodeOverride ?? ERROR_STATUS_MAP[code];
    this.details = details;
  }
}

export function buildSuccessEnvelope<T>(data: T, meta?: ApiMeta): ApiSuccessEnvelope<T> {
  if (meta !== undefined) {
    return { success: true, data, meta };
  }
  return { success: true, data };
}

export function buildErrorEnvelope(
  code: ErrorCode,
  message: string,
  details?: Record<string, unknown>
): ApiErrorEnvelope {
  return {
    success: false,
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
  };
}

export function okResponse<T>(data: T, meta?: ApiMeta, status = 200): NextResponse {
  return NextResponse.json(buildSuccessEnvelope(data, meta), { status });
}

export function handleApiError(err: unknown): NextResponse {
  if (err instanceof AppError) {
    return NextResponse.json(
      buildErrorEnvelope(err.code, err.message, err.details),
      { status: err.statusCode }
    );
  }

  if (err instanceof ZodError) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of err.issues) {
      const pathKey = issue.path.join('.') || 'root';
      if (!fieldErrors[pathKey]) {
        fieldErrors[pathKey] = [];
      }
      fieldErrors[pathKey].push(issue.message);
    }
    return NextResponse.json(
      buildErrorEnvelope('VALIDATION_ERROR', 'Input data tidak valid.', {
        fields: fieldErrors,
      }),
      { status: ERROR_STATUS_MAP.VALIDATION_ERROR }
    );
  }

  return NextResponse.json(
    buildErrorEnvelope('INTERNAL_ERROR', 'Terjadi kesalahan internal pada server.'),
    { status: ERROR_STATUS_MAP.INTERNAL_ERROR }
  );
}
