import { useCallback, useState } from "react";

import { ToastContext } from "./toastContext.js";

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((toast) => {
    const id = crypto.randomUUID();
    const details = typeof toast === "string" ? { title: toast } : toast;
    setToasts((current) => [...current, { id, ...details }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <aside className="toast-region" aria-live="polite" aria-label="Notifications">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast${toast.onClick ? " toast--clickable" : ""}`}
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
