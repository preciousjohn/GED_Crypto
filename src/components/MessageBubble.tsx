import type { ConfirmationDetail, Message } from '../types/conversation';
import { PaymentActions } from './PaymentActions';
import { PaymentInfoCard } from './PaymentInfoCard';
import './MessageBubble.css';

interface MessageBubbleProps {
  message: Message;
  approvalActive?: boolean;
  isProcessingPayment?: boolean;
  onApprove?: () => void;
  onDecline?: () => void;
  onRetryPayment?: () => void;
}

function ConfirmationCard({ detail }: { detail: ConfirmationDetail }) {
  return (
    <div className="confirmation-card">
      <div className="confirmation-card__row">
        <span className="confirmation-card__label">To</span>
        <span className="confirmation-card__value">{detail.contact}</span>
      </div>
      {detail.memo && (
        <div className="confirmation-card__row">
          <span className="confirmation-card__label">For</span>
          <span className="confirmation-card__value">{detail.memo}</span>
        </div>
      )}
      <div className="confirmation-card__row confirmation-card__row--highlight">
        <span className="confirmation-card__label">Amount</span>
        <span className="confirmation-card__value">
          {detail.amount} <span className="confirmation-card__muted">{detail.equivalent}</span>
        </span>
      </div>
      <div className="confirmation-card__row">
        <span className="confirmation-card__label">Network fee</span>
        <span className="confirmation-card__value">{detail.networkFee}</span>
      </div>
      <div className="confirmation-card__row">
        <span className="confirmation-card__label">Remaining balance</span>
        <span className="confirmation-card__value">{detail.remaining}</span>
      </div>
    </div>
  );
}

export function MessageBubble({
  message,
  approvalActive,
  isProcessingPayment,
  onApprove,
  onDecline,
  onRetryPayment,
}: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const showApproval = message.requiresApproval && approvalActive && onApprove && onDecline;
  const showProcessingActions =
    message.requiresApproval && isProcessingPayment && onApprove && onDecline;

  return (
    <div className={`message-bubble ${isUser ? 'message-bubble--user' : 'message-bubble--copilot'}`}>
      <div className="message-bubble__content">
        {message.text.split('\n').map((line, i) => (
          <p key={i}>{line}</p>
        ))}
        {message.detail && <ConfirmationCard detail={message.detail} />}
        {(showApproval || showProcessingActions) && (
          <PaymentActions
            onConfirm={onApprove}
            onCancel={onDecline}
            disabled={!approvalActive && !isProcessingPayment}
            isProcessing={isProcessingPayment}
          />
        )}
        {message.paymentInfo && (
          <PaymentInfoCard
            info={message.paymentInfo}
            onRetry={message.paymentInfo.status === 'failed' ? onRetryPayment : undefined}
          />
        )}
      </div>
    </div>
  );
}
