import { useEffect, useRef, useState } from "react";
import { MagnifyingGlass, PaperPlaneTilt, X } from "@phosphor-icons/react";
import { globalSearch } from "../../../api/search.js";
import { inviteUserToGroup } from "../../../api/groups.js";
import Avatar from "../../../shared/components/avatar/Avatar.jsx";
import { usePageNavigate } from "../../../shared/components/back-button/usePageBack.js";
import { useToast } from "../../../shared/components/toast/useToast.js";
import { usePaginationObserver } from "../../../shared/hooks/usePaginationObserver.js";
import { formatLocalDate } from "../../../shared/utils/dateTime.js";
import { useGroupInvitations } from "../hooks/useGroupInvitations.js";
import "./GroupInvitations.css";

export default function GroupInvitations({ groupID }) {
  const navigateTo = usePageNavigate();
  const { error: showError, success: showSuccess } = useToast();
  const {
    invitations,
    total,
    error,
    status,
    hasMore,
    cancellingInviteID,
    refresh,
    loadMore,
    cancel,
  } = useGroupInvitations(groupID);
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [invitingUserID, setInvitingUserID] = useState(null);
  const searchRef = useRef(null);
  const loading = status === "loading";
  const loadingMore = status === "loading-more";
  const loadMoreRef = usePaginationObserver({
    hasMore,
    status,
    loadMore,
  });
  const trimmedQuery = query.trim();
  const hasSearchInput = trimmedQuery.length >= 2;

  useEffect(() => {
    if (!error) {
      return;
    }
    showError("Could not load invitations", error || "Please try again.");
  }, [error, showError]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (!hasSearchInput) {
      return undefined;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const data = await globalSearch({
          query: trimmedQuery,
          types: ["users"],
          groupID,
        });
        if (cancelled) return;

        setUsers(data?.users || []);
      } catch (requestError) {
        if (!cancelled) {
          setUsers([]);
          showError(
            "Could not search users",
            requestError.message || "Please try again.",
          );
        }
      } finally {
        if (!cancelled) {
          setSearchLoading(false);
        }
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [groupID, hasSearchInput, trimmedQuery, showError]);

  function handleSearchChange(nextQuery) {
    setQuery(nextQuery);
    setSearchOpen(true);

    if (nextQuery.trim().length < 2) {
      setUsers([]);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);
  }

  async function handleInvite(user) {
    if (invitingUserID) {
      return;
    }
    setInvitingUserID(user.id);
    try {
      await inviteUserToGroup(groupID, user.id);
      showSuccess("Invitation sent");
      setQuery("");
      setUsers([]);
      setSearchOpen(false);
      await refresh();
    } catch (requestError) {
      showError(
        "Could not send invitation",
        requestError.message || "Please try again.",
      );
    } finally {
      setInvitingUserID(null);
    }
  }

  async function handleCancel(invitation) {
    const success = await cancel(invitation.invite_id);
    if (!success) {
      return;
    }
    showSuccess("Invitation cancelled");
  }
  if (loading) {
    return (
      <div className="group-invitations-state">Loading invitations...</div>
    );
  }
  if (status === "error" && invitations.length === 0) {
    return null;
  }

  return (
    <section className="group-invitations">
      <div className="group-invitations-header">
        <span className="group-invitations-label">INVITATIONS</span>

        <span className="group-invitations-count">
          {total} {total === 1 ? "invitation" : "invitations"}
        </span>
      </div>

      <div ref={searchRef} className="group-invitations-search">
        <div className="group-invitations-search-bar">
          <MagnifyingGlass size={18} />

          <input
            type="text"
            value={query}
            placeholder="Search users to invite..."
            aria-label="Search users to invite"
            onFocus={() => setSearchOpen(true)}
            onChange={(event) => handleSearchChange(event.target.value)}
          />

          {query && (
            <button
              type="button"
              className="group-invitations-search-clear"
              aria-label="Clear search"
              onClick={() => {
                handleSearchChange("");
              }}
            >
              <X size={16} weight="bold" />
            </button>
          )}
        </div>

        {searchOpen && (
          <div className="group-invitations-search-results">
            {!hasSearchInput ? (
              <div className="group-invitations-search-message">
                Type at least 2 characters to search users
              </div>
            ) : searchLoading ? (
              <div className="group-invitations-search-message">
                Searching users...
              </div>
            ) : users.length === 0 ? (
              <div className="group-invitations-search-message">
                No users available to invite
              </div>
            ) : (
              <div className="group-invitations-search-items">
                {users.map((user) => {
                  const fullName =
                    `${user.first_name} ${user.last_name}`.trim();

                  const inviting = invitingUserID === user.id;

                  return (
                    <button
                      key={user.id}
                      type="button"
                      className="group-invitations-search-result"
                      disabled={Boolean(invitingUserID)}
                      onClick={() => handleInvite(user)}
                    >
                      <div className="group-invitations-search-avatar">
                        <Avatar
                          avatarPath={user.avatar_path}
                          seed={user.id}
                          alt={fullName}
                        />
                      </div>

                      <div className="group-invitations-search-details">
                        <span className="group-invitations-search-name">
                          {fullName}
                        </span>

                        {user.nickname && (
                          <span className="group-invitations-search-nickname">
                            @{user.nickname}
                          </span>
                        )}
                      </div>

                      <div className="group-invitations-search-action">
                        <PaperPlaneTilt size={14} weight="bold" />
                        {inviting ? "Sending..." : "Invite"}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {invitations.length === 0 ? (
        <div className="group-invitations-empty">No pending invitations.</div>
      ) : (
        <div className="group-invitations-list">
          {invitations.map((invitation) => {
            const inviterName =
              `${invitation.inviter_first_name} ${invitation.inviter_last_name}`.trim();

            const invitedUserName =
              `${invitation.invited_user_first_name} ${invitation.invited_user_last_name}`.trim();

            const sentDate = formatLocalDate(invitation.created_at, {
              day: "numeric",
              month: "short",
              year: "numeric",
            });

            const cancelling = cancellingInviteID === invitation.invite_id;

            return (
              <div key={invitation.invite_id} className="group-invitation-row">
                <div className="group-invitation-person">
                  <Avatar
                    avatarPath={invitation.inviter_avatar_path}
                    seed={invitation.inviter_id}
                    className="group-invitation-avatar"
                    alt={inviterName}
                  />

                  <button
                    type="button"
                    className="group-invitation-identity"
                    onClick={() =>
                      navigateTo(`/profile/${invitation.inviter_id}`)
                    }
                  >
                    <span className="group-invitation-meta-label">
                      INVITED BY
                    </span>

                    <span className="group-invitation-name">{inviterName}</span>

                    {invitation.inviter_nickname && (
                      <span className="group-invitation-nickname">
                        @{invitation.inviter_nickname}
                      </span>
                    )}
                  </button>
                </div>

                <div className="group-invitation-person">
                  <Avatar
                    avatarPath={invitation.invited_user_avatar_path}
                    seed={invitation.invited_user_id}
                    className="group-invitation-avatar"
                    alt={invitedUserName}
                  />

                  <button
                    type="button"
                    className="group-invitation-identity"
                    onClick={() =>
                      navigateTo(`/profile/${invitation.invited_user_id}`)
                    }
                  >
                    <span className="group-invitation-meta-label">
                      INVITED USER
                    </span>

                    <span className="group-invitation-name">
                      {invitedUserName}
                    </span>

                    {invitation.invited_user_nickname && (
                      <span className="group-invitation-nickname">
                        @{invitation.invited_user_nickname}
                      </span>
                    )}
                  </button>
                </div>

                <div className="group-invitation-date">
                  <span className="group-invitation-meta-label">SENT</span>

                  <span>{sentDate}</span>
                </div>

                <button
                  type="button"
                  className="group-invitation-cancel"
                  disabled={cancelling}
                  onClick={() => handleCancel(invitation)}
                >
                  <X size={17} weight="bold" />
                  {cancelling ? "Cancelling..." : "Cancel"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {hasMore && (
        <div
          ref={loadMoreRef}
          className="group-invitations-scroll-trigger"
          aria-hidden="true"
        />
      )}

      {loadingMore && (
        <p className="group-invitations-loading-more">
          Loading more invitations...
        </p>
      )}
    </section>
  );
}
