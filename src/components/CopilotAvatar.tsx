import './CopilotAvatar.css';

interface CopilotAvatarProps {
  size?: number;
  active?: boolean;
  speaking?: boolean;
  /** When true, no inner circle — for use on a gradient FAB background */
  embedded?: boolean;
}

export function CopilotAvatar({ size = 56, active = false, speaking = false, embedded = false }: CopilotAvatarProps) {
  return (
    <div
      className={`copilot-avatar ${active ? 'copilot-avatar--active' : ''} ${speaking ? 'copilot-avatar--speaking' : ''}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="copilotGradient" x1="50" y1="10" x2="50" y2="90" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="var(--copilot-green-start)" />
            <stop offset="100%" stopColor="var(--copilot-green-end)" />
          </linearGradient>
        </defs>
        <g className="copilot-avatar__head">
          {!embedded && <circle cx="50" cy="50" r="50" fill="url(#copilotGradient)" />}
          <g className="copilot-avatar__eyes">
            <rect className="copilot-avatar__eye copilot-avatar__eye--left" x="28" y="36" width="14" height="28" rx="7" fill="white" />
            <rect className="copilot-avatar__eye copilot-avatar__eye--right" x="50" y="36" width="14" height="28" rx="7" fill="white" />
          </g>
        </g>
      </svg>
    </div>
  );
}
