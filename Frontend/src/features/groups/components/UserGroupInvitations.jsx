import { Check, X } from "@phosphor-icons/react";

import Avatar from "../../../shared/components/avatar/Avatar.jsx";
import { usePageNavigate } from "../../../shared/components/back-button/usePageBack.js";
import { useToast } from "../../../shared/components/toast/useToast.js";
import { usePaginationObserver } from "../../../shared/hooks/usePaginationObserver.js";
import { formatLocalDate } from "../../../shared/utils/dateTime.js";
import { useUserGroupInvitations } from "../hooks/useUserGroupInvitations.js";
import "./UserGroupInvitations.css";

export default function UserGroupInvitations({ onInvitationAccepted }) {
  const navigateTo = usePageNavigate();
  const { error: showError, success: showSuccess } = useToast();
  const {
    invitations,
    total,
    error,
    status,
    hasMore,
    respondingInviteID,
    loadMore,
    respond,
  } = useUserGroupInvitations();
  const loading = status === "loading";
  const loadingMore = status === "loading-more";
  const loadMoreRef = usePaginationObserver({
    hasMore,
    status,
    loadMore,
  });

  async function handleRespond(invitation, action) {
    const success = await respond(invitation.invite_id, action);

    if (!success) {
      return;
    }

    if (action === "accept") {
      showSuccess("Invitation accepted");

      if (onInvitationAccepted) {
        onInvitationAccepted();
      }

      return;
    }
    showSuccess("Invitation declined");
  }

  if (loading) {
    return (
      <div className="user-group-invitations-state">Loading invitations...</div>
    );
  }

  if (status === "error" && invitations.length === 0) {
    if (error) {
      showError("Could not load invitations", error || "Please try again.");
    }
    return null;
  }

  return (
    <section className="user-group-invitations">
      <div className="user-group-invitations-header">
        <span className="user-group-invitations-label">GROUP INVITATIONS</span>

        <span className="user-group-invitations-count">
          {total} {total === 1 ? "invitation" : "invitations"}
        </span>
      </div>

      {invitations.length === 0 ? (
        <div className="user-group-invitations-empty">
          You have no pending group invitations.
        </div>
      ) : (
        <div className="user-group-invitations-list">
          {invitations.map((invitation) => {
            const inviterName =
              `${invitation.inviter_first_name} ${invitation.inviter_last_name}`.trim();

            const sentDate = formatLocalDate(invitation.created_at, {
              day: "numeric",
              month: "short",
              year: "numeric",
            });

            const responding = respondingInviteID === invitation.invite_id;

            return (
              <div
                key={invitation.invite_id}
                className="user-group-invitation-row"
              >
                <button
                  type="button"
                  className="user-group-invitation-group"
                  onClick={() =>
                    navigateTo(`/groups?selected=${invitation.group_id}`)
                  }
                >
                  <span className="user-group-invitation-meta-label">
                    GROUP
                  </span>

                  <span className="user-group-invitation-title">
                    {invitation.group_title}
                  </span>
                </button>

                <div className="user-group-invitation-person">
                  <Avatar
                    avatarPath={invitation.inviter_avatar_path}
                    seed={invitation.inviter_id}
                    className="user-group-invitation-avatar"
                    alt={inviterName}
                  />

                  <button
                    type="button"
                    className="user-group-invitation-identity"
                    onClick={() =>
                      navigateTo(`/profile/${invitation.inviter_id}`)
                    }
                  >
                    <span className="user-group-invitation-meta-label">
                      INVITED BY
                    </span>

                    <span className="user-group-invitation-name">
                      {inviterName}
                    </span>

                    {invitation.inviter_nickname && (
                      <span className="user-group-invitation-nickname">
                        @{invitation.inviter_nickname}
                      </span>
                    )}
                  </button>
                </div>

                <div className="user-group-invitation-date">
                  <span className="user-group-invitation-meta-label">
                    RECEIVED
                  </span>

                  <span>{sentDate}</span>
                </div>

                <div className="user-group-invitation-actions">
                  <button
                    type="button"
                    className="user-group-invitation-accept"
                    disabled={responding}
                    onClick={() => handleRespond(invitation, "accept")}
                  >
                    <Check size={17} weight="bold" />
                    {responding ? "Responding..." : "Accept"}
                  </button>

                  <button
                    type="button"
                    className="user-group-invitation-decline"
                    disabled={responding}
                    onClick={() => handleRespond(invitation, "decline")}
                  >
                    <X size={17} weight="bold" />
                    Decline
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
          className="user-group-invitations-scroll-trigger"
          aria-hidden="true"
        />
      )}

      {loadingMore && (
        <p className="user-group-invitations-loading-more">
          Loading more invitations...
        </p>
      )}
    </section>
  );
}
