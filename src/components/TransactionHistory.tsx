import type { ConversationThread } from '../types/conversation';
import { formatUsd } from '../utils/sendIntent';
import './TransactionHistory.css';

interface TransactionHistoryProps {
  threads: ConversationThread[];
  onSelectThread: (threadId: string) => void;
}

function formatWhen(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const sameDay =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  if (sameDay) return `Today, ${time}`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getThreadPreview(thread: ConversationThread): string {
  const userMsg = [...thread.messages].reverse().find((m) => m.role === 'user');
  if (userMsg) return userMsg.text;
  const info = thread.paymentInfo;
  if (info?.contact) return `Payment to ${info.contact}`;
  return 'Conversation';
}

export function TransactionHistory({ threads, onSelectThread }: TransactionHistoryProps) {
  if (threads.length === 0) {
    return (
      <div className="tx-history tx-history--empty">
        <div className="tx-history__empty-icon" aria-hidden="true">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" strokeLinecap="round" />
          </svg>
        </div>
        <p className="tx-history__empty-title">No payment conversations yet</p>
        <p className="tx-history__empty-text">
          Payments you send through Crypto Copilot will appear here. Tap any conversation to view history or ask follow-up questions.
        </p>
      </div>
    );
  }

  return (
    <ul className="tx-history">
      {threads.map((thread) => {
        const info = thread.paymentInfo;
        const status = info?.status ?? 'pending';
        return (
          <li key={thread.id}>
            <button
              type="button"
              className="tx-history__item"
              onClick={() => onSelectThread(thread.id)}
            >
              <div className="tx-history__icon" aria-hidden="true">↑</div>
              <div className="tx-history__body">
                <div className="tx-history__row">
                  <span className="tx-history__label">
                    {info?.contact ? `Sent to ${info.contact}` : getThreadPreview(thread)}
                  </span>
                  {info?.amountUsd != null && (
                    <span className="tx-history__amount">−{formatUsd(info.amountUsd)}</span>
                  )}
                </div>
                <div className="tx-history__row tx-history__row--meta">
                  <span className="tx-history__preview">{getThreadPreview(thread)}</span>
                  <span className={`tx-history__status tx-history__status--${status}`}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </span>
                </div>
                <div className="tx-history__row tx-history__row--meta">
                  <span>{info?.asset ?? 'Payment'} · {formatWhen(thread.updatedAt)}</span>
                </div>
              </div>
              <span className="tx-history__chevron" aria-hidden="true">›</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
