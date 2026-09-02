import { useCallback, useState } from "react";
import { CheckCircle, Info, WarningCircle, XCircle } from "@phosphor-icons/react";

import { ToastContext } from "./toastContext.js";

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((toast) => {
    const id = crypto.randomUUID();
    const details = typeof toast === "string" ? { title: toast } : toast;
    setToasts((current) => [
      ...(details.variant === "error" ? current.filter((toast) => toast.variant !== "error") : current),
      { id, ...details },
    ]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 4000);
  }, []);
  const error = useCallback((title, description) => showToast({ title, description, variant: "error" }), [showToast]);
  const success = useCallback((title, description) => showToast({ title, description, variant: "success" }), [showToast]);
  const warning = useCallback((title, description) => showToast({ title, description, variant: "warning" }), [showToast]);
  const info = useCallback((title, description) => showToast({ title, description, variant: "info" }), [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, error, success, warning, info }}>
      {children}
      <aside className="toast-region" aria-live="polite" aria-label="Notifications">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast${toast.variant ? ` toast--${toast.variant}` : ""}${toast.onClick ? " toast--clickable" : ""}`}
            role={toast.onClick ? "button" : "status"}
            tabIndex={toast.onClick ? 0 : undefined}
            onClick={() => {
              toast.onClick?.();
              setToasts((current) => current.filter((item) => item.id !== toast.id));
            }}
            onKeyDown={(event) => {
              if (toast.onClick && (event.key === "Enter" || event.key === " ")) {
                toast.onClick();
                setToasts((current) => current.filter((item) => item.id !== toast.id));
              }
            }}
          >
            {toast.variant && <span className="toast__icon" aria-hidden="true">{{ error: <XCircle weight="fill" />, success: <CheckCircle weight="fill" />, warning: <WarningCircle weight="fill" />, info: <Info weight="fill" /> }[toast.variant]}</span>}
            <div>
              <strong>{toast.title}</strong>
              {toast.description && <p>{toast.description}</p>}
            </div>
            {toast.action && <button type="button" onClick={() => { toast.action.onClick?.(); setToasts((current) => current.filter((item) => item.id !== toast.id)); }}>{toast.action.label}</button>}
          </div>
        ))}
      </aside>
    </ToastContext.Provider>
  );
}
