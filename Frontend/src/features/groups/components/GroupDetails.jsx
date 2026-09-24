import { UsersThree } from "@phosphor-icons/react";
import { formatLocalDate } from "../../../shared/utils/dateTime.js";

import "./GroupDetails.css";

export default function GroupDetails({
  group,
  loading,
  error,
  actionLoading,
  onJoin,
  onCancelRequest,
  mode,
  onLeave,
  isCreator,
}) {
  if (loading) {
    return (
      <aside className="group-details">
        <p>Loading group...</p>
      </aside>
    );
  }

  if (error || !group) {
    return null;
  }

  const creatorName =
    group.creator_nickname ||
    `${group.creator_first_name} ${group.creator_last_name}`;

  return (
    <aside
      className={`group-details border-glow ${
        mode === "discover" ? "group-details-discover" : "group-details-member"
      }`}
    >
      <div className="group-details-field">
        <h2>{group.title}</h2>
        <div className="group-details-members">
          <UsersThree size={20} />
          <span>{group.member_count}</span>
        </div>
      </div>

      <div className="group-details-field group-details-description">
        <span className="group-details-label">Description</span>
        <p>{group.description}</p>
      </div>

      <div className="group-details-field">
        <span className="group-details-label">Group Info</span>
        <p>Created by {creatorName}</p>
        <p>
          {formatLocalDate(group.created_at, {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </p>
      </div>
      <div className="group-details-actions">
        {mode === "discover" && (
          <>
            {group.has_pending_request ? (
              <button
                type="button"
                onClick={onCancelRequest}
                disabled={actionLoading}
              >
                {actionLoading ? "Cancelling..." : "Cancel Request"}
              </button>
            ) : (
              <button type="button" onClick={onJoin} disabled={actionLoading}>
                {actionLoading ? "Sending..." : "Join Group"}
              </button>
            )}
          </>
        )}

        {mode === "member" && !isCreator && (
          <button
            type="button"
            className="group-leave-button"
            onClick={onLeave}
            disabled={actionLoading}
          >
            {actionLoading ? "Leaving..." : "Leave Group"}
          </button>
        )}
      </div>
    </aside>
  );
}
