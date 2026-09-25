import { UsersThree } from "@phosphor-icons/react";
import { formatLocalDate } from "../../../shared/utils/dateTime.js";

import "./DetailsCard.css";

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
      <aside className="details-card">
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
    <aside className="details-card">
      <div className="details-field details-heading">
        <h2 className="details-title">{group.title}</h2>

        <div className="group-details-members">
          <UsersThree size={20} />
          <span>{group.member_count}</span>
        </div>
      </div>

      <div className="details-field">
        <span className="details-label">Description</span>
        <p className="details-description">{group.description}</p>
      </div>

      <div className="details-field">
        <span className="details-label">Group Info</span>

        <p>Created by {creatorName}</p>

        <p>
          {formatLocalDate(group.created_at, {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </p>
      </div>

      <div className="details-actions">
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
