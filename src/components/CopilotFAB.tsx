import { CopilotAvatar } from './CopilotAvatar';
import './CopilotFAB.css';

interface CopilotFABProps {
  onClick: () => void;
  isOpen?: boolean;
}

export function CopilotFAB({ onClick, isOpen = false }: CopilotFABProps) {
  return (
    <div className={`copilot-fab-wrap ${isOpen ? 'copilot-fab-wrap--open' : ''}`}>
      {!isOpen && <span className="copilot-fab__pulse" aria-hidden="true" />}
      <button
        type="button"
        className="copilot-fab"
        onClick={onClick}
        aria-label={isOpen ? 'Close Crypto Copilot' : 'Open Crypto Copilot'}
      >
        <CopilotAvatar size={64} active={!isOpen} embedded />
      </button>
    </div>
  );
}
