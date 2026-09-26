import { UsersThree } from "@phosphor-icons/react";
import { formatLocalDate } from "../../../shared/utils/dateTime.js";
import Skeleton from "../../../shared/components/skeleton/Skeleton.jsx";

import "./GroupCard.css";

export default function GroupCard({
  group,
  selected,
  onSelect,
  filter,
  currentUserID,
}) {
  const joinedDate = group.joined_at
    ? formatLocalDate(group.joined_at, {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "";

  const isCreator = String(group.creator_id) === String(currentUserID);

  return (
    <button
      type="button"
      className={`group-card ${selected ? "group-card-selected" : ""}`}
      onClick={onSelect}
    >
      <div className="group-card-header">
        <h2>{group.title}</h2>

        <span className="group-member-count">
          <UsersThree size={16} />
          {group.member_count}
        </span>
      </div>

      {filter === "mine" && (
        <span className="group-card-membership">
          {isCreator ? "Creator" : `Joined ${joinedDate}`}
        </span>
      )}

      <p className="group-card-description">{group.description}</p>
    </button>
  );
}

export function GroupCardSkeleton({ count = 6, filter }) {
  return Array.from({ length: count }).map((_, index) => (
    <div
      key={index}
      className="group-card group-card--skeleton"
      aria-hidden="true"
    >
      <div className="group-card-header">
        <Skeleton variant="text" width="58%" height={17} />
        <Skeleton variant="text" width={34} height={15} />
      </div>

      {filter === "mine" && (
        <Skeleton variant="text" width="38%" height={12} />
      )}

      <div className="group-card-skeleton-description">
        <Skeleton variant="text" width="92%" height={13} />
        <Skeleton variant="text" width="68%" height={13} />
      </div>
    </div>
  ));
}
