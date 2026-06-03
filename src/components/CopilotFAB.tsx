import { CopilotAvatar } from './CopilotAvatar';
import './CopilotFAB.css';

interface CopilotFABProps {
  onClick: () => void;
  isOpen?: boolean;
}

export function CopilotFAB({ onClick, isOpen = false }: CopilotFABProps) {
  return (
    <button
      type="button"
      className={`copilot-fab ${isOpen ? 'copilot-fab--open' : ''}`}
      onClick={onClick}
      aria-label={isOpen ? 'Close Crypto Copilot' : 'Open Crypto Copilot'}
    >
      <CopilotAvatar size={56} active={!isOpen} />
      {!isOpen && <span className="copilot-fab__pulse" aria-hidden="true" />}
    </button>
  );
}
