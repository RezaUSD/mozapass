/**
 * Structured JSON Logger dengan penyensoran otomatis field sensitif (NFR-006)
 */

const SENSITIVE_KEY_PATTERN =
  /^(password|password_hash|passwordhash|token|snaptoken|snap_token|authorization|cookie|secret|qr_secret_key|qrsecretkey|jwt_secret|jwtsecret|midtrans_server_key|midtransserverkey|signature_key|signaturekey)$/i;

export type LogLevel = 'INFO' | 'WARN' | 'ERROR';

export type DomainLogEvent =
  | 'ORDER_CREATED'
  | 'ORDER_PAID'
  | 'ORDER_EXPIRED'
  | 'ORDER_CANCELLED'
  | 'WEBHOOK_DUPLICATE_IGNORED'
  | 'WEBHOOK_SIGNATURE_INVALID'
  | 'OVERBOOK_PAYMENT_ALERT'
  | 'TICKET_CHECKED_IN'
  | 'TICKET_CHECKIN_REJECTED'
  | 'AUTH_EVENT'
  | 'SYSTEM_ERROR';

export function redactSensitiveData(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactSensitiveData(item));
  }

  if (typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (SENSITIVE_KEY_PATTERN.test(key)) {
        result[key] = '[REDACTED]';
      } else {
        result[key] = redactSensitiveData(val);
      }
    }
    return result;
  }

  return value;
}

export function formatStructuredLog(
  level: LogLevel,
  event: DomainLogEvent | string,
  message: string,
  context?: Record<string, unknown>
): string {
  const safeContext = context
    ? (redactSensitiveData(context) as Record<string, unknown>)
    : undefined;

  return JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    event,
    message,
    ...(safeContext ? { context: safeContext } : {}),
  });
}

export const logger = {
  info(event: DomainLogEvent | string, message: string, context?: Record<string, unknown>): void {
    const line = formatStructuredLog('INFO', event, message, context);
    if (process.env.NODE_ENV !== 'test') {
      process.stdout.write(`${line}\n`);
    }
  },
  warn(event: DomainLogEvent | string, message: string, context?: Record<string, unknown>): void {
    const line = formatStructuredLog('WARN', event, message, context);
    if (process.env.NODE_ENV !== 'test') {
      process.stdout.write(`${line}\n`);
    }
  },
  error(event: DomainLogEvent | string, message: string, context?: Record<string, unknown>): void {
    const line = formatStructuredLog('ERROR', event, message, context);
    if (process.env.NODE_ENV !== 'test') {
      process.stderr.write(`${line}\n`);
    }
  },
};
