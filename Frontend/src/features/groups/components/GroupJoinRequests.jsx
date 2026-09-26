import { useEffect } from "react";
import { Check, X } from "@phosphor-icons/react";

import { usePageNavigate } from "../../../shared/components/back-button/usePageBack.js";
import { useToast } from "../../../shared/components/toast/useToast.js";
import Avatar from "../../../shared/components/avatar/Avatar.jsx";
import { formatLocalDate } from "../../../shared/utils/dateTime.js";
import { usePaginationObserver } from "../../../shared/hooks/usePaginationObserver.js";
import { useGroupJoinRequests } from "../hooks/useGroupJoinRequests.js";
import { GroupJoinRequestsSkeleton } from "./GroupSectionSkeletons.jsx";
import "./GroupJoinRequests.css";

export default function GroupJoinRequests({ groupID }) {
  const navigateTo = usePageNavigate();
  const { error: showError, success: showSuccess } = useToast();
  const {
    requests,
    total,
    error,
    status,
    hasMore,
    respondingRequestID,
    loadMore,
    respond,
  } = useGroupJoinRequests(groupID);
  const loading = status === "loading";
  const loadingMore = status === "loading-more";
  const loadMoreRef = usePaginationObserver({ hasMore, status, loadMore });

  useEffect(() => {
    if (!error) {
      return;
    }

    showError("Could not load join requests", error || "Please try again.");
  }, [error, showError]);

  async function handleResponse(request, action) {
    const success = await respond(request.request_id, action);

    if (!success) {
      return;
    }

    if (action === "accept") {
      showSuccess("Join request accepted");
    } else {
      showSuccess("Join request declined");
    }
  }

  if (loading) {
    return <GroupJoinRequestsSkeleton />;
  }

  if (status === "error" && requests.length === 0) {
    return null;
  }

  return (
    <section className="group-join-requests">
      <div className="group-join-requests-header">
        <span className="group-join-requests-label">GROUP MANAGEMENT</span>
        <span className="group-join-requests-count">
          {total} {total === 1 ? "request" : "requests"}
        </span>
      </div>

      {requests.length === 0 ? (
        <div className="group-join-requests-empty">
          No pending join requests.
        </div>
      ) : (
        <div className="group-join-requests-list">
          {requests.map((request) => {
            const fullName =
              `${request.first_name} ${request.last_name}`.trim();

            const requestedDate = formatLocalDate(request.created_at, {
              day: "numeric",
              month: "short",
              year: "numeric",
            });

            const responding = respondingRequestID === request.request_id;

            return (
              <div key={request.request_id} className="group-join-request-row">
                <Avatar
                  avatarPath={request.avatar_path}
                  seed={request.user_id}
                  className="group-join-request-avatar"
                  alt={fullName}
                />

                <button
                  type="button"
                  className="group-join-request-identity"
                  onClick={() => navigateTo(`/profile/${request.user_id}`)}
                >
                  <span className="group-join-request-name">{fullName}</span>

                  {request.nickname && (
                    <span className="group-join-request-nickname">
                      @{request.nickname}
                    </span>
                  )}
                </button>

                <div className="group-join-request-date">
                  <span className="group-join-request-meta-label">
                    REQUESTED
                  </span>

                  <span>{requestedDate}</span>
                </div>

                <div className="group-join-request-actions">
                  <button
                    type="button"
                    className="group-join-request-button accept"
                    disabled={responding}
                    title="Accept"
                    aria-label={`Accept ${fullName}'s join request`}
                    onClick={() => handleResponse(request, "accept")}
                  >
                    <Check size={18} weight="bold" />
                  </button>
                  <button
                    type="button"
                    className="group-join-request-button decline"
                    disabled={responding}
                    title="Decline"
                    aria-label={`Decline ${fullName}'s join request`}
                    onClick={() => handleResponse(request, "decline")}
                  >
                    <X size={18} weight="bold" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {hasMore && (
        <div
          ref={loadMoreRef}
          className="group-join-requests-scroll-trigger"
          aria-hidden="true"
        />
      )}

      {loadingMore && (
        <GroupJoinRequestsSkeleton count={1} pagination />
      )}
    </section>
  );
}
