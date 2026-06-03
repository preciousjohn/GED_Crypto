import './CopilotAvatar.css';

interface CopilotAvatarProps {
  size?: number;
  active?: boolean;
  speaking?: boolean;
}

export function CopilotAvatar({ size = 56, active = false, speaking = false }: CopilotAvatarProps) {
  return (
    <div
      className={`copilot-avatar ${active ? 'copilot-avatar--active' : ''} ${speaking ? 'copilot-avatar--speaking' : ''}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="copilotGradient" x1="10" y1="10" x2="90" y2="90" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="var(--copilot-blue-start)" />
            <stop offset="100%" stopColor="var(--copilot-blue-end)" />
          </linearGradient>
        </defs>
        <g className="copilot-avatar__head">
          <circle cx="50" cy="50" r="48" fill="url(#copilotGradient)" />
          <g className="copilot-avatar__eyes">
            <rect className="copilot-avatar__eye copilot-avatar__eye--left" x="28" y="36" width="14" height="28" rx="7" fill="white" />
            <rect className="copilot-avatar__eye copilot-avatar__eye--right" x="50" y="36" width="14" height="28" rx="7" fill="white" />
          </g>
        </g>
      </svg>
    </div>
  );
}
