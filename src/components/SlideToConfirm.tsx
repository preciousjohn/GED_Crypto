import { useCallback, useRef, useState, type CSSProperties } from 'react';
import './SlideToConfirm.css';

interface SlideToConfirmProps {
  label?: string;
  onConfirm: () => void;
  onCancel: () => void;
  disabled?: boolean;
}

export function SlideToConfirm({
  label = 'Slide to send',
  onConfirm,
  onCancel,
  disabled = false,
}: SlideToConfirmProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const startXRef = useRef(0);
  const maxDragRef = useRef(0);

  const reset = useCallback(() => {
    setDragX(0);
    setDragging(false);
    setConfirmed(false);
  }, []);

  const handlePointerDown = (clientX: number) => {
    if (disabled || confirmed) return;
    const track = trackRef.current;
    if (!track) return;
    const thumbWidth = 52;
    maxDragRef.current = track.offsetWidth - thumbWidth - 8;
    startXRef.current = clientX - dragX;
    setDragging(true);
  };

  const handlePointerMove = (clientX: number) => {
    if (!dragging || disabled || confirmed) return;
    const next = Math.min(maxDragRef.current, Math.max(0, clientX - startXRef.current));
    setDragX(next);
  };

  const handlePointerUp = () => {
    if (!dragging || disabled || confirmed) return;
    setDragging(false);
    const threshold = maxDragRef.current * 0.88;
    if (dragX >= threshold) {
      setConfirmed(true);
      setDragX(maxDragRef.current);
      onConfirm();
    } else {
      setDragX(0);
    }
  };

  const progress = maxDragRef.current > 0 ? dragX / maxDragRef.current : 0;

  return (
    <div className="slide-confirm">
      <button
        type="button"
        className="slide-confirm__approve-btn"
        onClick={onConfirm}
        disabled={disabled || confirmed}
      >
        {confirmed ? 'Sending…' : 'Send payment'}
      </button>
      <p className="slide-confirm__or">or slide to confirm</p>
      <div
        ref={trackRef}
        className={`slide-confirm__track ${disabled ? 'slide-confirm__track--disabled' : ''} ${confirmed ? 'slide-confirm__track--done' : ''}`}
        style={{ '--slide-progress': progress } as CSSProperties}
        onPointerMove={(e) => dragging && handlePointerMove(e.clientX)}
        onPointerUp={handlePointerUp}
        onPointerLeave={() => dragging && handlePointerUp()}
      >
        <span className="slide-confirm__label">{confirmed ? 'Sending…' : label}</span>
        <button
          type="button"
          className="slide-confirm__thumb"
          style={{ transform: `translateX(${dragX}px)` }}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            handlePointerDown(e.clientX);
          }}
          onPointerMove={(e) => handlePointerMove(e.clientX)}
          onPointerUp={(e) => {
            e.currentTarget.releasePointerCapture(e.pointerId);
            handlePointerUp();
          }}
          disabled={disabled || confirmed}
          aria-label={label}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8-8-8z" />
          </svg>
        </button>
      </div>
      {!confirmed && (
        <button type="button" className="slide-confirm__cancel" onClick={() => { reset(); onCancel(); }} disabled={disabled}>
          Cancel payment
        </button>
      )}
    </div>
  );
}
