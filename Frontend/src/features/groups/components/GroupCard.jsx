import { UsersThree } from "@phosphor-icons/react";
import { formatLocalDate } from "../../../shared/utils/dateTime.js";

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
