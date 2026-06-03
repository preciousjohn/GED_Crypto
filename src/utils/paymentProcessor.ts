import type { SendRequest } from '../types/portfolio';

export type PaymentErrorCode = 'network' | 'timeout' | 'duplicate' | 'partial' | 'offline';

export interface PaymentSuccess {
  ok: true;
  transactionId: string;
  fee: number;
  deliveryMethod: string;
}

export interface PaymentFailure {
  ok: false;
  error: PaymentErrorCode;
  message: string;
  partialTransactionId?: string;
}

export type PaymentResult = PaymentSuccess | PaymentFailure;

const PROCESSING_LATENCY_MS = 1800;
const TIMEOUT_MS = 8000;

/** Time before a pending payment transitions to sent */
export const PAYMENT_SETTLE_MS = 10_000;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function generateTransactionId(): string {
  return `TX-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

/** Demo trigger: amounts ending in .99 simulate a network failure */
function isDemoFailure(request: SendRequest): boolean {
  const cents = Math.round((request.amountUsd % 1) * 100);
  return cents === 99;
}

/** Demo trigger: amounts ending in .98 simulate a timeout */
function isDemoTimeout(request: SendRequest): boolean {
  const cents = Math.round((request.amountUsd % 1) * 100);
  return cents === 98;
}

/** Demo trigger: amounts ending in .97 simulate partial failure */
function isDemoPartial(request: SendRequest): boolean {
  const cents = Math.round((request.amountUsd % 1) * 100);
  return cents === 97;
}

export async function processPayment(
  request: SendRequest,
  getNetworkFee: (asset: SendRequest['asset']) => number,
  signal?: AbortSignal
): Promise<PaymentResult> {
  if (!navigator.onLine) {
    return { ok: false, error: 'offline', message: 'You appear to be offline. Check your connection and try again.' };
  }

  const fee = getNetworkFee(request.asset);

  try {
    await Promise.race([
      delay(PROCESSING_LATENCY_MS),
      new Promise<never>((_, reject) => {
        const timer = setTimeout(() => reject(new Error('timeout')), TIMEOUT_MS);
        signal?.addEventListener('abort', () => {
          clearTimeout(timer);
          reject(new Error('aborted'));
        });
      }),
    ]);
  } catch {
    if (signal?.aborted) {
      return { ok: false, error: 'network', message: 'Payment was interrupted. You can retry when ready.' };
    }
    return { ok: false, error: 'timeout', message: 'Payment timed out. Your funds were not deducted.' };
  }

  if (signal?.aborted) {
    return { ok: false, error: 'network', message: 'Payment was interrupted. You can retry when ready.' };
  }

  if (!navigator.onLine) {
    return { ok: false, error: 'offline', message: 'Connection lost during processing. Please retry.' };
  }

  if (isDemoTimeout(request)) {
    return { ok: false, error: 'timeout', message: 'Payment timed out. Your funds were not deducted.' };
  }

  if (isDemoPartial(request)) {
    return {
      ok: false,
      error: 'partial',
      message: 'Payment partially failed — amount was reserved but not delivered. Contact support or retry.',
      partialTransactionId: generateTransactionId(),
    };
  }

  if (isDemoFailure(request)) {
    return { ok: false, error: 'network', message: 'Network error during payment processing. Please try again.' };
  }

  return {
    ok: true,
    transactionId: generateTransactionId(),
    fee,
    deliveryMethod: 'Instant crypto transfer',
  };
}

export function formatPaymentTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
