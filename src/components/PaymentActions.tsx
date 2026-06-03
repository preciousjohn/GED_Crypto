import './PaymentActions.css';

interface PaymentActionsProps {
  onConfirm: () => void;
  onCancel: () => void;
  disabled?: boolean;
  isProcessing?: boolean;
}

export function PaymentActions({ onConfirm, onCancel, disabled = false, isProcessing = false }: PaymentActionsProps) {
  return (
    <div className="payment-actions">
      <button
        type="button"
        className="payment-actions__send"
        onClick={onConfirm}
        disabled={disabled || isProcessing}
      >
        {isProcessing ? 'Sending…' : 'Send Payment'}
      </button>
      {!isProcessing && (
        <button
          type="button"
          className="payment-actions__cancel"
          onClick={onCancel}
          disabled={disabled}
        >
          Cancel payment
        </button>
      )}
    </div>
  );
}
