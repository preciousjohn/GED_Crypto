import type { Activity } from '../types/portfolio';
import { formatUsd } from '../utils/sendIntent';
import './TransactionHistory.css';

interface TransactionHistoryProps {
  transactions: Activity[];
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

export function TransactionHistory({ transactions }: TransactionHistoryProps) {
  if (transactions.length === 0) {
    return (
      <div className="tx-history tx-history--empty">
        <div className="tx-history__empty-icon" aria-hidden="true">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" strokeLinecap="round" />
          </svg>
        </div>
        <p className="tx-history__empty-title">No transactions yet</p>
        <p className="tx-history__empty-text">Payments you send through Crypto Copilot will show up here.</p>
      </div>
    );
  }

  return (
    <ul className="tx-history">
      {transactions.map((tx) => (
        <li key={tx.id} className="tx-history__item">
          <div className="tx-history__icon" aria-hidden="true">↑</div>
          <div className="tx-history__body">
            <div className="tx-history__row">
              <span className="tx-history__label">Sent to {tx.contact}</span>
              <span className="tx-history__amount">−{formatUsd(tx.amountUsd)}</span>
            </div>
            <div className="tx-history__row tx-history__row--meta">
              <span>{tx.asset} · {formatWhen(tx.timestamp)}</span>
              <span>Fee {formatUsd(tx.feeUsd)}</span>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
