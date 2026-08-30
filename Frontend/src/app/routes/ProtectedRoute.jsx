import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { getProfile } from "../../api/Profile.js";

const unauthenticatedErrors = new Set([
  "unauthorized",
  "authentication required",
  "session expired or invalid",
]);

export default function ProtectedRoute() {
  const location = useLocation();
  const [status, setStatus] = useState("checking");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function checkSession() {
      try {
        await getProfile({ includePosts: false });
        if (active) setStatus("authenticated");
      } catch (requestError) {
        if (!active) return;

        if (unauthenticatedErrors.has(requestError.message)) {
          setStatus("unauthenticated");
          return;
        }

        setError(requestError.message || "Could not verify your session");
        setStatus("error");
      }
    }

    checkSession();
    return () => {
      active = false;
    };
  }, []);

  if (status === "checking") {
    return (
      <main className="auth-page">
        <p>Checking your session…</p>
      </main>
    );
  }

  if (status === "unauthenticated") {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (status === "error") {
    return (
      <main className="auth-page">
        <p className="form-error">{error}</p>
      </main>
    );
  }

  return <Outlet />;
}
