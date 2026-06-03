import type { ConfirmationDetail, Message } from '../hooks/useCopilotConversation';
import { SlideToConfirm } from './SlideToConfirm';
import './MessageBubble.css';

interface MessageBubbleProps {
  message: Message;
  approvalActive?: boolean;
  onApprove?: () => void;
  onDecline?: () => void;
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
      <div className="confirmation-card__row">
        <span className="confirmation-card__label">Tax impact</span>
        <span className="confirmation-card__value confirmation-card__value--green">{detail.taxImpact}</span>
      </div>
    </div>
  );
}

export function MessageBubble({ message, approvalActive, onApprove, onDecline }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const showApproval = message.requiresApproval && approvalActive && onApprove && onDecline;

  return (
    <div className={`message-bubble ${isUser ? 'message-bubble--user' : 'message-bubble--copilot'}`}>
      <div className="message-bubble__content">
        {message.text.split('\n').map((line, i) => (
          <p key={i}>{line}</p>
        ))}
        {message.detail && <ConfirmationCard detail={message.detail} />}
        {showApproval && (
          <SlideToConfirm
            label="Slide to send payment"
            onConfirm={onApprove}
            onCancel={onDecline}
          />
        )}
        {message.requiresApproval && !approvalActive && (
          <p className="message-bubble__resolved">Payment resolved</p>
        )}
      </div>
    </div>
  );
}
