import {
  CheckCircle,
  Info,
  WarningCircle,
  XCircle,
} from "@phosphor-icons/react";

const variantIcons = {
  error: <XCircle weight="fill" />,
  success: <CheckCircle weight="fill" />,
  warning: <WarningCircle weight="fill" />,
  info: <Info weight="fill" />,
};

export default function Toast({ toast, onDismiss }) {
  const clickable = Boolean(toast.onClick);

  function dismiss() {
    onDismiss(toast.id);
  }

  function handleToastClick() {
    toast.onClick?.();
    dismiss();
  }

  function handleKeyDown(event) {
    if (clickable && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      handleToastClick();
    }
  }

  function handleActionClick(event) {
    event.stopPropagation();
    toast.action.onClick?.();
    dismiss();
  }

  return (
    <div
      className={`toast loop-glass-surface${toast.variant ? ` toast--${toast.variant}` : ""}${clickable ? " toast--clickable" : ""}`}
      role={clickable ? "button" : "status"}
      tabIndex={clickable ? 0 : undefined}
      onClick={handleToastClick}
      onKeyDown={handleKeyDown}
    >
      {toast.variant && (
        <span className="toast__icon" aria-hidden="true">
          {variantIcons[toast.variant]}
        </span>
      )}

      <div>
        <strong>{toast.title}</strong>
        {toast.description && <p>{toast.description}</p>}
      </div>

      {toast.action && (
        <button type="button" onClick={handleActionClick}>
          {toast.action.label}
        </button>
      )}
    </div>
  );
}
