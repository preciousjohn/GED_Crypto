import type { ConfirmationDetail, Message } from '../hooks/useCopilotConversation';
import './MessageBubble.css';

interface MessageBubbleProps {
  message: Message;
  onAction?: (value: string) => void;
}

function ConfirmationCard({ detail }: { detail: ConfirmationDetail }) {
  return (
    <div className="confirmation-card">
      <div className="confirmation-card__row">
        <span className="confirmation-card__label">To</span>
        <span className="confirmation-card__value">{detail.contact}</span>
      </div>
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

export function MessageBubble({ message, onAction }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`message-bubble ${isUser ? 'message-bubble--user' : 'message-bubble--copilot'}`}>
      <div className="message-bubble__content">
        {message.text.split('\n').map((line, i) => (
          <p key={i}>{line}</p>
        ))}
        {message.detail && <ConfirmationCard detail={message.detail} />}
        {message.actions && onAction && (
          <div className="message-bubble__actions">
            {message.actions.map((action) => (
              <button
                key={action.value}
                type="button"
                className={`message-bubble__action ${action.value === 'yes' ? 'message-bubble__action--primary' : ''}`}
                onClick={() => onAction(action.value)}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
