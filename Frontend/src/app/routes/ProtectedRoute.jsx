import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { ArrowClockwise, CloudSlash } from "@phosphor-icons/react";
import { getProfile } from "../../api/profile.js";
import { ChatRealtimeProvider } from "../../features/chat/realtime/ChatRealtimeProvider.jsx";
import HeaderNav from "../../shared/components/header-nav/HeaderNav.jsx";

const unauthenticatedErrors = new Set([
  "unauthorized",
  "authentication required",
  "session expired or invalid",
]);

const AuthBackground = lazy(
  () => import("../../features/auth/components/AuthBackground.jsx"),
);

function AuthStatusBackground() {
  return (
    <Suspense fallback={<div className="auth-background" aria-hidden="true" />}>
      <AuthBackground />
    </Suspense>
  );
}

function AuthStatusScreen({ children }) {
  return (
    <main className="auth-page">
      <AuthStatusBackground />
      {children}
    </main>
  );
}

export default function ProtectedRoute() {
  const location = useLocation();
  const [status, setStatus] = useState("checking");
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const [currentProfile, setCurrentProfile] = useState(null);

  useEffect(() => {
    let active = true;

    async function checkSession() {
      try {
        const profile = await getProfile({ includePosts: false });
        if (active) {
          setCurrentProfile(profile);
          setStatus("authenticated");
        }
      } catch (requestError) {
        if (!active) return;

        if (unauthenticatedErrors.has(requestError.message)) {
          setStatus("unauthenticated");
          return;
        }

        setError(requestError.message || "Failed to verify your session");
        setStatus("error");
      }
    }

    checkSession();
    return () => {
      active = false;
    };
  }, [retryCount]);

  useEffect(() => {
    function handleSessionExpired() {
      setCurrentProfile(null);
      setStatus("unauthenticated");
    }
    window.addEventListener("session-expired", handleSessionExpired);
    return () => {
      window.removeEventListener("session-expired", handleSessionExpired);
    };
  }, []);

  const outletContext = useMemo(() => ({ currentProfile }), [currentProfile]);

  if (status === "checking") {
    return (
      <AuthStatusScreen>
        <section className="auth-status-card loop-glass-surface">
          <span className="auth-status-card__icon" aria-hidden="true">
            <ArrowClockwise weight="bold" />
          </span>
          <div>
            <p className="auth-eyebrow">One moment</p>
            <h1>Checking your session</h1>
            <p className="auth-description">Connecting you to Loop…</p>
          </div>
        </section>
      </AuthStatusScreen>
    );
  }

  if (status === "unauthenticated") {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (status === "error") {
    return (
      <AuthStatusScreen>
        <section
          className="auth-status-card loop-glass-surface"
          aria-labelledby="server-unavailable-title"
        >
          <span
            className="auth-status-card__icon auth-status-card__icon--error"
            aria-hidden="true"
          >
            <CloudSlash weight="duotone" />
          </span>
          <div>
            <p className="auth-eyebrow">Connection problem</p>
            <h1 id="server-unavailable-title">We can’t reach Loop</h1>
            <p className="auth-description">{error}</p>
          </div>
          <button
            className="loop-button loop-button--primary"
            type="button"
            onClick={() => setRetryCount((count) => count + 1)}
          >
            <ArrowClockwise weight="bold" />
            Try again
          </button>
        </section>
      </AuthStatusScreen>
    );
  }

  return (
    <ChatRealtimeProvider>
      <HeaderNav />
      <Outlet context={outletContext} />
    </ChatRealtimeProvider>
  );
}
