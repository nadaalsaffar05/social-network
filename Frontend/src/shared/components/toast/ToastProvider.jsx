import { useCallback, useEffect, useRef, useState } from "react";

import Toast from "./Toast.jsx";
import { ToastContext } from "./toastContext.js";

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timeoutIDsRef = useRef(new Map());

  const dismissToast = useCallback((toastID) => {
    const timeoutID = timeoutIDsRef.current.get(toastID);

    if (timeoutID !== undefined) {
      window.clearTimeout(timeoutID);
      timeoutIDsRef.current.delete(toastID);
    }

    setToasts((current) => current.filter((toast) => toast.id !== toastID));
  }, []);

  const showToast = useCallback((toast) => {
    const id = crypto.randomUUID();
    const details = typeof toast === "string" ? { title: toast } : toast;
    setToasts((current) => [
      ...(details.variant === "error"
        ? current.filter((toast) => toast.variant !== "error")
        : current),
      { id, ...details },
    ]);
    const timeoutID = window.setTimeout(() => dismissToast(id), 4000);
    timeoutIDsRef.current.set(id, timeoutID);
  }, [dismissToast]);
  const error = useCallback(
    (title, description) => showToast({ title, description, variant: "error" }),
    [showToast],
  );
  const success = useCallback(
    (title, description) =>
      showToast({ title, description, variant: "success" }),
    [showToast],
  );
  const warning = useCallback(
    (title, description) =>
      showToast({ title, description, variant: "warning" }),
    [showToast],
  );
  const info = useCallback(
    (title, description) => showToast({ title, description, variant: "info" }),
    [showToast],
  );
  useEffect(() => {
    const timeoutIDs = timeoutIDsRef.current;

    return () => {
      timeoutIDs.forEach((timeoutID) => window.clearTimeout(timeoutID));
      timeoutIDs.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, error, success, warning, info }}>
      {children}
      <aside
        className="toast-region"
        aria-live="polite"
        aria-label="Notifications"
      >
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onDismiss={dismissToast} />
        ))}
      </aside>
    </ToastContext.Provider>
  );
}
