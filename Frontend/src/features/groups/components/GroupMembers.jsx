import { useEffect } from "react";
import Avatar from "../../../shared/components/avatar/Avatar.jsx";

import { usePageNavigate } from "../../../shared/components/back-button/usePageBack.js";
import { useToast } from "../../../shared/components/toast/useToast.js";
import { formatLocalDate } from "../../../shared/utils/dateTime.js";
import { usePaginationObserver } from "../../../shared/hooks/usePaginationObserver.js";
import { useGroupMembers } from "../hooks/useGroupMembers.js";
import "./GroupMembers.css";

export default function GroupMembers({ groupID, memberCount }) {
  const navigateTo = usePageNavigate();
  const { error: showError } = useToast();
  const { members, error, status, hasMore, loadMore } =
    useGroupMembers(groupID);
  const loading = status === "loading";
  const loadingMore = status === "loading-more";
  const loadMoreRef = usePaginationObserver({ hasMore, status, loadMore });

  useEffect(() => {
    if (!error) {
      return;
    }

    showError("Could not load members", error || "Please try again.");
  }, [error, showError]);

  if (loading) {
    return <div className="group-members-state">Loading members...</div>;
  }

  if (status === "error" && members.length === 0) {
    return null;
  }

  return (
    <section className="group-members">
      <div className="group-members-header">
        <span className="group-members-label">GROUP MEMBERS</span>
        <span className="group-members-count">
          {memberCount} {memberCount === 1 ? "member" : "members"}
        </span>
      </div>

      <div className="group-members-list">
        {members.map((member) => {
          const joinedDate = formatLocalDate(member.joined_at, {
            day: "numeric",
            month: "short",
            year: "numeric",
          });

          const fullName = `${member.first_name} ${member.last_name}`.trim();

          return (
            <div key={member.user_id} className="group-member-row">
              <Avatar
                avatarPath={member.avatar_path}
                seed={member.user_id}
                className="group-member-avatar"
                alt={fullName}
              />

              <div className="group-member-identity">
                <div className="group-member-name-row">
                  <span className="group-member-name">{fullName}</span>

                  {member.role === "CREATOR" && (
                    <span className="group-member-role">Creator</span>
                  )}
                </div>

                {member.nickname && (
                  <span className="group-member-nickname">
                    @{member.nickname}
                  </span>
                )}
              </div>

              <div className="group-member-joined">
                <span className="group-member-meta-label">JOINED</span>

                <span>{joinedDate}</span>
              </div>

              <button
                type="button"
                className="group-member-profile-button"
                onClick={() => navigateTo(`/profile/${member.user_id}`)}
              >
                View Profile
              </button>
            </div>
          );
        })}
      </div>

      {hasMore && (
        <div
          ref={loadMoreRef}
          className="group-members-scroll-trigger"
          aria-hidden="true"
        />
      )}

      {loadingMore && (
        <p className="group-members-loading-more">Loading more members...</p>
      )}
    </section>
  );
}
