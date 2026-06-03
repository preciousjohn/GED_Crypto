import type { PaymentInfo } from '../types/conversation';
import { formatPaymentTimestamp } from '../utils/paymentProcessor';
import './PaymentInfoCard.css';

const STATUS_LABELS: Record<PaymentInfo['status'], string> = {
  sent: 'Sent',
  pending: 'Pending',
  failed: 'Failed',
  processing: 'Processing',
};

interface PaymentInfoCardProps {
  info: PaymentInfo;
  onRetry?: () => void;
}

export function PaymentInfoCard({ info, onRetry }: PaymentInfoCardProps) {
  return (
    <div className="payment-info-card">
      <h4 className="payment-info-card__title">Payment Information</h4>
      <div className="payment-info-card__row">
        <span className="payment-info-card__label">Status</span>
        <span className={`payment-info-card__value payment-info-card__value--${info.status}`}>
          {STATUS_LABELS[info.status]}
        </span>
      </div>
      {info.completedAt && (
        <div className="payment-info-card__row">
          <span className="payment-info-card__label">Completed</span>
          <span className="payment-info-card__value">{formatPaymentTimestamp(info.completedAt)}</span>
        </div>
      )}
      {info.transactionId && (
        <div className="payment-info-card__row">
          <span className="payment-info-card__label">Transaction ID</span>
          <span className="payment-info-card__value payment-info-card__value--mono">{info.transactionId}</span>
        </div>
      )}
      {info.deliveryMethod && (
        <div className="payment-info-card__row">
          <span className="payment-info-card__label">Delivery Method</span>
          <span className="payment-info-card__value">{info.deliveryMethod}</span>
        </div>
      )}
      {info.status === 'failed' && onRetry && (
        <button type="button" className="payment-info-card__retry" onClick={onRetry}>
          Retry payment
        </button>
      )}
    </div>
  );
}
