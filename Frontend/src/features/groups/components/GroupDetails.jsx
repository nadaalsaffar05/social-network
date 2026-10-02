import { useState } from "react";
import { UsersThree } from "@phosphor-icons/react";
import { formatLocalDate } from "../../../shared/utils/dateTime.js";
import Skeleton from "../../../shared/components/skeleton/Skeleton.jsx";

import "./DetailsCard.css";

export default function GroupDetails({
  group,
  loading,
  error,
  actionLoading,
  onJoin,
  onCancelRequest,
  onAcceptInvite,
  onDeclineInvite,
  mode,
  onLeave,
  isCreator,
}) {
  const [expandedDescriptionGroupID, setExpandedDescriptionGroupID] =
    useState("");

  if (loading) {
    return (
      <aside className="details-card">
        <div className="group-details-skeleton" aria-label="Loading group">
          <Skeleton variant="text" width="68%" height={22} />
          <Skeleton variant="text" width="100%" height={12} />
          <Skeleton variant="text" width="78%" height={12} />
          <Skeleton variant="text" width="48%" height={12} />
          <Skeleton variant="button" width="100%" height={42} />
        </div>
      </aside>
    );
  }

  if (error || !group) {
    return null;
  }

  const creatorName =
    group.creator_nickname ||
    `${group.creator_first_name} ${group.creator_last_name}`;
  const hasLongDescription = group.description?.length > 180;
  const isDescriptionExpanded = expandedDescriptionGroupID === group.id;

  return (
    <aside
      className={`details-card${isDescriptionExpanded ? " details-card--expanded" : ""}`}
    >
      <div className="details-field details-heading">
        <h2 className="details-title">{group.title}</h2>

        <div className="group-details-members">
          <UsersThree size={20} />
          <span>{group.member_count}</span>
        </div>
      </div>

      <div className="details-field">
        <span className="details-label">Description</span>
        <p
          className={`details-description${
            hasLongDescription && !isDescriptionExpanded
              ? " details-description--collapsed"
              : ""
          }`}
        >
          {group.description}
        </p>
        {hasLongDescription && (
          <button
            type="button"
            className="details-description-toggle"
            onClick={() =>
              setExpandedDescriptionGroupID((expandedGroupID) =>
                expandedGroupID === group.id ? "" : group.id,
              )
            }
            aria-expanded={isDescriptionExpanded}
          >
            {isDescriptionExpanded ? "Show less" : "Read more"}
          </button>
        )}
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
            {group.has_pending_invite ? (
              <>
                <button
                  type="button"
                  onClick={onAcceptInvite}
                  disabled={actionLoading}
                >
                  {actionLoading ? "Responding..." : "Accept"}
                </button>

                <button
                  type="button"
                  onClick={onDeclineInvite}
                  disabled={actionLoading}
                >
                  {actionLoading ? "Responding..." : "Decline"}
                </button>
              </>
            ) : group.has_pending_request ? (
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
