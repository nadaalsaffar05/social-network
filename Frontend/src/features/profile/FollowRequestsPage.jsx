import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, X, UserPlus } from "@phosphor-icons/react";
import {
  getFollowRequests,
  respondToFollowRequest,
} from "../../api/profile.js";
import Avatar from "../../shared/components/avatar/Avatar.jsx";
import PageHeader from "../../shared/components/back-button/PageHeader.jsx";
import { usePageNavigate } from "../../shared/components/back-button/usePageBack.js";
import GradientWaves from "../feed/components/GradientWaves.jsx";
import { GRADIENT_WAVE_PROPS } from "../feed/constants.js";
import { formatLocalDateTime } from "../../shared/utils/dateTime.js";
import { getUserFullName } from "../../shared/utils/user.js";
import { useChatRealtime } from "../chat/realtime/useChatRealtime.js";
import "./FollowRequestsPage.css";

const followRequestDateOptions = {
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
};

export default function FollowRequestsPage() {
  const navigate = useNavigate();
  const navigateTo = usePageNavigate();
  const { refreshAttentionCounts } = useChatRealtime();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchRequests() {
      try {
        setLoading(true);
        setError("");
        const data = await getFollowRequests();
        if (isMounted) {
          setRequests(data);
        }
      } catch (err) {
        if (
          err.message === "unauthorized" ||
          err.message === "authentication required" ||
          err.message === "session expired or invalid"
        ) {
          navigate("/login", { replace: true });
          return;
        }
        if (isMounted) {
          setError(err.message || "Failed to load follow requests");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchRequests();
    return () => {
      isMounted = false;
    };
  }, [navigate]);

  async function handleResponse(requestId, action) {
    setProcessingId(requestId);
    setError("");
    try {
      await respondToFollowRequest(requestId, action);
      setRequests((prev) => prev.filter((r) => r.id !== requestId));
      await refreshAttentionCounts();
    } catch (err) {
      setError(err.message || `Failed to ${action} follow request`);
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <main className="follow-requests-layout">
      <div className="follow-requests-waves">
        <GradientWaves {...GRADIENT_WAVE_PROPS} />
      </div>

      <div className="follow-requests-container">
        <PageHeader
          title={
            <>
              Follow requests
              {requests.length > 0 && (
                <span className="follow-requests-badge">{requests.length}</span>
              )}
            </>
          }
        />

        {error && <div className="follow-requests-message error">{error}</div>}

        <section className="follow-requests-content">
          {loading ? (
            <div className="follow-requests-empty">
              <p className="follow-requests-empty-text">
                Loading follow requests
              </p>
            </div>
          ) : requests.length > 0 ? (
            requests.map((req) => {
              const fullName = getUserFullName(req, "User");
              const handle = req.nickname
                ? `@${req.nickname}`
                : req.email
                  ? `@${req.email.split("@")[0]}`
                  : "";
              const isProcessing = processingId === req.id;

              return (
                <div key={req.id} className="follow-request-card">
                  <div
                    className="follow-request-user"
                    onClick={() =>
                      req.sender_id && navigateTo(`/profile/${req.sender_id}`)
                    }
                    role="button"
                    tabIndex={0}
                  >
                    <Avatar
                      avatarPath={req.avatar_path}
                      seed={req.id}
                      className="follow-request-avatar"
                    />
                    <div className="follow-request-info">
                      <h3 className="follow-request-name">{fullName}</h3>
                      {handle && (
                        <span className="follow-request-handle">{handle}</span>
                      )}
                      {req.created_at && (
                        <span className="follow-request-time">
                          {formatLocalDateTime(
                            req.created_at,
                            followRequestDateOptions,
                          )}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="follow-request-actions">
                    <button
                      type="button"
                      className="btn-accept"
                      disabled={isProcessing}
                      onClick={() => handleResponse(req.id, "accept")}
                    >
                      <Check size={16} weight="bold" />
                      {isProcessing ? "Saving" : "Accept"}
                    </button>
                    <button
                      type="button"
                      className="btn-decline"
                      disabled={isProcessing}
                      onClick={() => handleResponse(req.id, "decline")}
                    >
                      <X size={16} weight="bold" />
                      Decline
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="follow-requests-empty">
              <UserPlus
                size={48}
                className="follow-requests-empty-icon"
                weight="duotone"
              />
              <h2 className="follow-requests-empty-title">
                No pending requests
              </h2>
              <p className="follow-requests-empty-text">
                When someone requests to follow your private account, their
                request will appear here
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
