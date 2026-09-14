import { AlertCircle, X } from "lucide-react";

function ErrorMessage({
  message = "Something went wrong. Please try again.",
  onClose,
}) {
  if (!message) return null;

  return (
    <div
      className="error-message"
      role="alert"
    >
      <AlertCircle size={19} />

      <span>{message}</span>

      {onClose && (
        <button
          type="button"
          className="error-message__close"
          onClick={onClose}
          aria-label="Close error message"
        >
          <X size={18} />
        </button>
      )}
    </div>
  );
}

export default ErrorMessage;