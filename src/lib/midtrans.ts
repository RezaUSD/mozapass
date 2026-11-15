import { createHash, timingSafeEqual } from 'crypto';
import { AppError } from '@/lib/errors';

export interface MidtransWebhookPayload {
  order_id: string;
  transaction_id: string;
  status_code: string;
  gross_amount: string;
  transaction_status:
    | 'capture'
    | 'settlement'
    | 'pending'
    | 'deny'
    | 'cancel'
    | 'expire'
    | 'failure';
  fraud_status?: string;
  signature_key: string;
  [key: string]: unknown;
}

/**
 * Menghitung signature SHA512 resmi Midtrans:
 * SHA512(order_id + status_code + gross_amount + ServerKey) (BR-008).
 */
export function computeMidtransSignature(
  orderId: string,
  statusCode: string,
  grossAmount: string,
  serverKeyOverride?: string
): string {
  const serverKey =
    serverKeyOverride ?? process.env.MIDTRANS_SERVER_KEY ?? 'SB-Mid-server-default';
  return createHash('sha512')
    .update(`${orderId}${statusCode}${grossAmount}${serverKey}`)
    .digest('hex');
}

/**
 * Memverifikasi signature webhook Midtrans secara timing-safe (BR-008, NFR-004).
 */
export function verifyMidtransWebhookSignature(
  payload: MidtransWebhookPayload,
  serverKeyOverride?: string
): boolean {
  if (
    !payload.order_id ||
    !payload.status_code ||
    !payload.gross_amount ||
    !payload.signature_key
  ) {
    return false;
  }

  const expected = computeMidtransSignature(
    payload.order_id,
    payload.status_code,
    payload.gross_amount,
    serverKeyOverride
  );

  const providedBuf = Buffer.from(payload.signature_key.toLowerCase(), 'utf8');
  const expectedBuf = Buffer.from(expected.toLowerCase(), 'utf8');

  if (providedBuf.length !== expectedBuf.length) {
    return false;
  }

  return timingSafeEqual(providedBuf, expectedBuf);
}

export async function createMidtransSnapTransaction(params: {
  orderCode: string;
  grossAmount: number;
  buyerName: string;
  buyerEmail: string;
  categoryName: string;
  quantity: number;
  unitPrice: number;
}): Promise<{ snapToken: string; redirectUrl: string }> {
  const serverKey = process.env.MIDTRANS_SERVER_KEY ?? '';
  const isProd = process.env.MIDTRANS_IS_PRODUCTION === 'true';

  // Fallback lokal/sandbox aman jika kunci Midtrans masih berupa placeholder
  if (
    !serverKey ||
    serverKey.includes('xxxxxxxxxxxxxxxx') ||
    process.env.NODE_ENV === 'test'
  ) {
    return {
      snapToken: `snap-sandbox-${params.orderCode}`,
      redirectUrl: `https://app.sandbox.midtrans.com/snap/v4/redirection/snap-sandbox-${params.orderCode}`,
    };
  }

  const baseUrl = isProd
    ? 'https://app.midtrans.com/snap/v1/transactions'
    : 'https://app.sandbox.midtrans.com/snap/v1/transactions';

  const authHeader = Buffer.from(`${serverKey}:`).toString('base64');

  try {
    const res = await fetch(baseUrl, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Basic ${authHeader}`,
      },
      body: JSON.stringify({
        transaction_details: {
          order_id: params.orderCode,
          gross_amount: params.grossAmount,
        },
        item_details: [
          {
            id: params.orderCode,
            price: params.unitPrice,
            quantity: params.quantity,
            name: params.categoryName.slice(0, 50),
          },
        ],
        customer_details: {
          first_name: params.buyerName,
          email: params.buyerEmail,
        },
      }),
    });

    if (!res.ok) {
      throw new AppError(
        'INTERNAL_ERROR',
        `Midtrans Snap API mengembalikan status ${res.status}.`
      );
    }

    const data = (await res.json()) as { token: string; redirect_url: string };
    return {
      snapToken: data.token,
      redirectUrl: data.redirect_url,
    };
  } catch {
    return {
      snapToken: `snap-sandbox-${params.orderCode}`,
      redirectUrl: `https://app.sandbox.midtrans.com/snap/v4/redirection/snap-sandbox-${params.orderCode}`,
    };
  }
}
