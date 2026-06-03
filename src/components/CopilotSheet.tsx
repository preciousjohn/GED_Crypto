import { useEffect, useRef, useState } from 'react';
import { CopilotAvatar } from './CopilotAvatar';
import { MessageBubble } from './MessageBubble';
import { TransactionHistory } from './TransactionHistory';
import type { useCopilotConversation } from '../hooks/useCopilotConversation';
import type { PortfolioApi } from '../hooks/usePortfolio';
import './CopilotSheet.css';

type CopilotState = ReturnType<typeof useCopilotConversation>;

interface CopilotSheetProps {
  isOpen: boolean;
  onClose: () => void;
  copilot: CopilotState;
  portfolio: PortfolioApi;
}

function BackIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function HistoryIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CopilotSheet({ isOpen, onClose, copilot, portfolio }: CopilotSheetProps) {
  const {
    messages,
    isListening,
    isTyping,
    liveTranscript,
    sendUserMessage,
    handleApprove,
    handleDecline,
    startListening,
    step,
    approvalActive,
  } = copilot;
  const [input, setInput] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) setShowHistory(false);
  }, [isOpen]);

  useEffect(() => {
    if (!showHistory) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping, approvalActive, showHistory]);

  useEffect(() => {
    if (isOpen && !showHistory) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen, showHistory]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    setInput('');
    sendUserMessage(text);
  };

  const handleBack = () => {
    if (showHistory) {
      setShowHistory(false);
      return;
    }
    onClose();
  };

  const speaking = isTyping || step === 'processing';
  const micDisabled = isListening || isTyping || approvalActive || showHistory;

  const statusText = showHistory
    ? `${portfolio.transactions.length} payment${portfolio.transactions.length === 1 ? '' : 's'}`
    : approvalActive
      ? 'Slide to approve payment'
      : isListening
        ? 'Listening…'
        : isTyping
          ? 'Thinking…'
          : step === 'success'
            ? 'Payment sent'
            : 'Ready — type or tap mic';

  return (
    <div
      className={`copilot-sheet ${isOpen ? 'copilot-sheet--open' : ''}`}
      role="dialog"
      aria-label={showHistory ? 'Transaction history' : 'Crypto Copilot'}
      aria-modal="true"
      aria-hidden={!isOpen}
    >
      <header className="copilot-sheet__header">
        <button
          type="button"
          className="copilot-sheet__nav-btn"
          onClick={handleBack}
          aria-label={showHistory ? 'Back to Crypto Copilot' : 'Back to portfolio'}
        >
          <BackIcon />
        </button>

        <div className="copilot-sheet__header-center">
          {!showHistory && <CopilotAvatar size={36} active speaking={speaking} />}
          <div className="copilot-sheet__header-text">
            <h2 className="copilot-sheet__title">
              {showHistory ? 'Transaction history' : 'Crypto Copilot'}
            </h2>
            <p className="copilot-sheet__status">{statusText}</p>
          </div>
        </div>

        {showHistory ? (
          <span className="copilot-sheet__nav-spacer" aria-hidden="true" />
        ) : (
          <button
            type="button"
            className="copilot-sheet__nav-btn"
            onClick={() => setShowHistory(true)}
            aria-label="View transaction history"
          >
            <HistoryIcon />
          </button>
        )}
      </header>

      {showHistory ? (
        <div className="copilot-sheet__history">
          <TransactionHistory transactions={portfolio.transactions} />
        </div>
      ) : (
        <>
          <div className="copilot-sheet__messages">
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                approvalActive={approvalActive}
                onApprove={handleApprove}
                onDecline={handleDecline}
              />
            ))}
            {isTyping && (
              <div className="copilot-sheet__typing" aria-label="Crypto Copilot is typing">
                <span /><span /><span />
              </div>
            )}
            {isListening && (
              <div className="copilot-sheet__listening">
                <div className="copilot-sheet__waveform">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className="copilot-sheet__wave-bar" style={{ animationDelay: `${i * 0.1}s` }} />
                  ))}
                </div>
                <p className="copilot-sheet__listening-hint">Say who to pay and how much</p>
                {liveTranscript && (
                  <p className="copilot-sheet__transcript">"{liveTranscript}"</p>
                )}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <footer className="copilot-sheet__footer">
            <button
              type="button"
              className={`copilot-sheet__mic ${isListening ? 'copilot-sheet__mic--active' : ''}`}
              onClick={startListening}
              disabled={micDisabled}
              aria-label="Speak your payment request"
              title={approvalActive ? 'Approve the payment with the slide control first' : 'Voice input'}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5-3c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
              </svg>
            </button>

            <form className="copilot-sheet__input-form" onSubmit={handleSubmit}>
              <input
                ref={inputRef}
                type="text"
                className="copilot-sheet__input"
                placeholder={
                  approvalActive
                    ? 'Approve with slide below…'
                    : 'Send Sarah $50 in USDC for dinner…'
                }
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isListening}
              />
              <button
                type="submit"
                className="copilot-sheet__send"
                disabled={!input.trim() || isListening}
                aria-label="Send message"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              </button>
            </form>
          </footer>
        </>
      )}
    </div>
  );
}
