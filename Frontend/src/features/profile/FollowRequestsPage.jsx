import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, UserCheck, Check, X } from "@phosphor-icons/react";

import { getFollowRequests, respondToFollowRequest } from "../../api/profile.js";
import { useToast } from "../../shared/components/toast/useToast.js";
import Avatar from "../../shared/components/avatar/Avatar.jsx";
import GradientWaves from "../feed/components/GradientWaves.jsx";
import { GRADIENT_WAVE_PROPS } from "../feed/constants.js";
import { FollowRequestsSkeleton } from "../../shared/components/skeleton/PageSkeletons.jsx";
import "./FollowRequestsPage.css";

function nameOf(request) {
  return request.nickname || [request.first_name, request.last_name].filter(Boolean).join(" ") || "User";
}

export default function FollowRequestsPage() {
  const navigate = useNavigate();
  const { error: showError, success: showSuccess } = useToast();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionID, setActionID] = useState(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    getFollowRequests()
      .then((response) => {
        if (isMounted) {
          setRequests(response.requests ?? []);
        }
      })
      .catch((requestError) => {
        if (isMounted) {
          showError("Could not load follow requests", requestError.message || "Please try again");
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [showError]);

  async function respond(requestID, action) {
    setActionID(requestID);
    try {
      await respondToFollowRequest(requestID, action);
      setRequests((current) => current.filter((request) => request.id !== requestID));
      showSuccess(action === "accept" ? "Follow request accepted" : "Follow request declined");
    } catch (requestError) {
      showError("Could not update follow request", requestError.message || "Please try again");
    } finally {
      setActionID(null);
    }
  }

  if (loading) {
    return <FollowRequestsSkeleton />;
  }

  return (
    <div className="follow-requests-layout">
      <div className="follow-requests-waves">
        <GradientWaves {...GRADIENT_WAVE_PROPS} />
      </div>

      <div className="follow-requests-container">
        <header className="follow-requests-header-card">
          <div className="follow-requests-header-left">
            <button
              type="button"
              className="follow-requests-back-btn"
              aria-label="Go back"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft size={20} />
            </button>
            <h1 className="follow-requests-title">
              Follow requests
              {requests.length > 0 && (
                <span className="follow-requests-badge">{requests.length}</span>
              )}
            </h1>
          </div>
        </header>

        <main className="follow-requests-content">
          {requests.length === 0 ? (
            <div className="follow-requests-empty">
              <UserCheck size={48} className="follow-requests-empty-icon" weight="duotone" />
              <h3 className="follow-requests-empty-title">No pending requests</h3>
              <p className="follow-requests-empty-text">
                When someone requests to follow your private profile, their request will appear here.
              </p>
            </div>
          ) : (
            requests.map((request) => {
              const displayName = nameOf(request);
              const handle = request.nickname ? `@${request.nickname}` : (request.email ? `@${request.email.split('@')[0]}` : '');
              return (
                <article key={request.id} className="follow-request-card">
                  <div
                    className="follow-request-user"
                    onClick={() => navigate(`/profile/${request.id}`)}
                  >
                    <Avatar
                      avatarPath={request.avatar_path}
                      seed={request.id}
                      className="follow-request-avatar"
                    />
                    <div className="follow-request-info">
                      <h4 className="follow-request-name">{displayName}</h4>
                      {handle && <span className="follow-request-handle">{handle}</span>}
                    </div>
                  </div>

                  <div className="follow-request-actions">
                    <button
                      type="button"
                      className="btn-accept"
                      disabled={actionID === request.id}
                      onClick={() => respond(request.id, "accept")}
                    >
                      <Check size={16} weight="bold" />
                      Accept
                    </button>
                    <button
                      type="button"
                      className="btn-decline"
                      disabled={actionID === request.id}
                      onClick={() => respond(request.id, "decline")}
                    >
                      <X size={16} weight="bold" />
                      Decline
                    </button>
                  </div>
                </article>
              );
            })
          )}
        </main>
      </div>
    </div>
  );
}
