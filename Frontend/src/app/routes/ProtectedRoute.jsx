import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft } from "@phosphor-icons/react";
import { getProfile } from "../../api/profile.js";
import { ChatRealtimeProvider } from "../../features/chat/realtime/ChatRealtimeProvider.jsx";
import HeaderNav from "../../shared/components/header-nav/HeaderNav.jsx";

const unauthenticatedErrors = new Set([
  "unauthorized",
  "authentication required",
  "session expired or invalid",
]);

export default function ProtectedRoute() {
  const location = useLocation();
  const navigate = useNavigate();
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

        setError(requestError.message || "Failed to verify your session");
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

  const hasPageBackButton = location.pathname !== "/home" && !location.pathname.startsWith("/posts/") && !location.pathname.startsWith("/messages") && !location.pathname.startsWith("/profile")&& !location.pathname.startsWith("/notifications");
  const pageTitle = location.pathname.startsWith("/follow-requests") ? "Follow requests" : "Message requests";
  return (
    <ChatRealtimeProvider>
      <HeaderNav />
      {hasPageBackButton && (
        <button className="app-back-button" type="button" aria-label="Go back" onClick={() => window.history.length > 1 ? navigate(-1) : navigate("/home")}>
          <ArrowLeft size={22} />
          <span>{pageTitle}</span>
        </button>
      )}
      <Outlet />
    </ChatRealtimeProvider>
  );
}

