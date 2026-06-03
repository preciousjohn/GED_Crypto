import { useEffect, useRef, useState } from 'react';
import { CopilotAvatar } from './CopilotAvatar';
import { MessageBubble } from './MessageBubble';
import type { useCopilotConversation } from '../hooks/useCopilotConversation';
import './CopilotSheet.css';

type CopilotState = ReturnType<typeof useCopilotConversation>;

interface CopilotSheetProps {
  isOpen: boolean;
  onClose: () => void;
  copilot: CopilotState;
}

export function CopilotSheet({ isOpen, onClose, copilot }: CopilotSheetProps) {
  const {
    messages,
    isListening,
    isTyping,
    liveTranscript,
    listeningHint,
    sendUserMessage,
    handleAction,
    startListening,
    step,
  } = copilot;
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    setInput('');
    sendUserMessage(text);
  };

  const speaking = isTyping || step === 'processing';

  return (
    <div
      className={`copilot-sheet ${isOpen ? 'copilot-sheet--open' : ''}`}
      role="dialog"
      aria-label="Crypto Copilot"
      aria-modal="true"
      aria-hidden={!isOpen}
    >
        <header className="copilot-sheet__header">
          <div className="copilot-sheet__header-left">
            <CopilotAvatar size={40} active speaking={speaking} />
            <div>
              <h2 className="copilot-sheet__title">Crypto Copilot</h2>
              <p className="copilot-sheet__status">
                {isListening
                  ? listeningHint
                  : isTyping
                    ? 'Thinking…'
                    : step === 'success'
                      ? 'Payment sent'
                      : step === 'confirmation'
                        ? 'Waiting for your response…'
                        : 'Ready — tap mic or just speak'}
              </p>
            </div>
          </div>
          <button type="button" className="copilot-sheet__close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </header>

        <div className="copilot-sheet__messages">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} onAction={handleAction} />
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
              <p className="copilot-sheet__listening-hint">{listeningHint}</p>
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
            disabled={isListening || isTyping}
            aria-label={step === 'confirmation' ? 'Speak yes or no' : 'Speak your request'}
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
              placeholder={step === 'confirmation' ? 'Or type Yes / No…' : 'Send Sarah $50 for dinner…'}
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
    </div>
  );
}
