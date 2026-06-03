import { useEffect, useRef, useState } from 'react';
import { CopilotAvatar } from './CopilotAvatar';
import { MessageBubble } from './MessageBubble';
import { TransactionHistory } from './TransactionHistory';
import type { useCopilotConversation } from '../hooks/useCopilotConversation';
import './CopilotSheet.css';

type CopilotState = ReturnType<typeof useCopilotConversation>;

interface CopilotSheetProps {
  isOpen: boolean;
  onClose: () => void;
  copilot: CopilotState;
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

export function CopilotSheet({ isOpen, onClose, copilot }: CopilotSheetProps) {
  const {
    messages,
    paymentThreads,
    isListening,
    isTyping,
    isProcessingPayment,
    isOnline,
    paymentError,
    voiceError,
    isSpeechSupported,
    liveTranscript,
    sendUserMessage,
    handleApprove,
    handleDecline,
    handleRetryPayment,
    startListening,
    step,
    approvalActive,
    openThread,
  } = copilot;
  const [input, setInput] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const historyOpen = isOpen && showHistory;
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!historyOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping, approvalActive, isProcessingPayment, historyOpen]);

  useEffect(() => {
    if (isOpen && !historyOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen, historyOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    setInput('');
    sendUserMessage(text);
  };

  const handleBack = () => {
    if (historyOpen) {
      setShowHistory(false);
      return;
    }
    setShowHistory(false);
    onClose();
  };

  const handleSelectThread = (threadId: string) => {
    openThread(threadId);
    setShowHistory(false);
  };

  const speaking = isTyping || step === 'processing' || isProcessingPayment;
  const micDisabled = isListening || isTyping || approvalActive || isProcessingPayment || historyOpen;

  const statusText = historyOpen
    ? `${paymentThreads.length} conversation${paymentThreads.length === 1 ? '' : 's'}`
    : !isOnline
      ? 'Offline — reconnect to send payments'
      : approvalActive
        ? 'Review payment below'
        : isProcessingPayment
          ? 'Processing payment…'
          : isListening
            ? 'Listening… tap mic to stop'
            : isTyping
              ? 'Thinking…'
              : !isSpeechSupported
                ? 'Voice unavailable — type your request'
                : step === 'success'
                ? 'Payment sent'
                : step === 'pending'
                  ? 'Payment pending'
                  : step === 'failed'
                  ? 'Payment failed'
                  : 'Type or tap mic';

  return (
    <div
      className={`copilot-sheet ${isOpen ? 'copilot-sheet--open' : ''}`}
      role="dialog"
      aria-label={historyOpen ? 'Transaction history' : 'Crypto Copilot'}
      aria-modal="true"
      aria-hidden={!isOpen}
    >
      <header className="copilot-sheet__header">
        <button
          type="button"
          className="copilot-sheet__nav-btn"
          onClick={handleBack}
          aria-label={historyOpen ? 'Back to Crypto Copilot' : 'Back to portfolio'}
        >
          <BackIcon />
        </button>

        <div className="copilot-sheet__header-center">
          {!historyOpen && <CopilotAvatar size={36} active speaking={speaking} />}
          <div className="copilot-sheet__header-text">
            <h2 className="copilot-sheet__title">
              {historyOpen ? 'Transaction history' : 'Crypto Copilot'}
            </h2>
            <p className={`copilot-sheet__status ${!isOnline ? 'copilot-sheet__status--warn' : ''}`}>
              {statusText}
            </p>
          </div>
        </div>

        {historyOpen ? (
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

      {historyOpen ? (
        <div className="copilot-sheet__history">
          <TransactionHistory threads={paymentThreads} onSelectThread={handleSelectThread} />
        </div>
      ) : (
        <>
          <div className="copilot-sheet__messages">
            {paymentError && step === 'confirmation' && (
              <div className="copilot-sheet__banner copilot-sheet__banner--error" role="alert">
                {paymentError}
              </div>
            )}
            {!isOnline && (
              <div className="copilot-sheet__banner copilot-sheet__banner--warn" role="status">
                You're offline. Messages are saved — reconnect to send payments.
              </div>
            )}
            {voiceError && (
              <div className="copilot-sheet__banner copilot-sheet__banner--warn" role="alert">
                {voiceError}
              </div>
            )}
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                approvalActive={approvalActive}
                isProcessingPayment={isProcessingPayment && msg.requiresApproval === true}
                onApprove={handleApprove}
                onDecline={handleDecline}
                onRetryPayment={handleRetryPayment}
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
              onClick={() => void startListening()}
              disabled={micDisabled && !isListening}
              aria-label={isListening ? 'Stop listening' : 'Speak your payment request'}
              aria-pressed={isListening}
              title={
                !isSpeechSupported
                  ? 'Voice input is not supported in this browser'
                  : approvalActive
                    ? 'Confirm the payment with Send Payment first'
                    : isListening
                      ? 'Tap to stop listening'
                      : 'Voice input'
              }
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
                    ? 'Confirm with Send Payment below…'
                    : 'Send or ask about a payment…'
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
