import { EnvelopeIcon, UsersThree, UserPlus } from "@phosphor-icons/react";

import "./GroupNavigation.css";

export default function GroupNavigation({
  activeSection,
  onSectionChange,
  isCreator,
}) {
  return (
    <nav className="group-tabs">
      <div className="group-tabs-main">
        <button
          type="button"
          className={`group-tab ${activeSection === "posts" ? "active" : ""}`}
          onClick={() => onSectionChange("posts")}
        >
          Posts
        </button>

        <button
          type="button"
          className={`group-tab ${activeSection === "chat" ? "active" : ""}`}
          onClick={() => onSectionChange("chat")}
        >
          Chat
        </button>

        <button
          type="button"
          className={`group-tab ${activeSection === "events" ? "active" : ""}`}
          onClick={() => onSectionChange("events")}
        >
          Events
        </button>
      </div>

      <div className="group-tabs-management">
        <button
          type="button"
          className={`group-tab group-tab-icon group-tab-icon--expandable ${
            activeSection === "members" ? "active" : ""
          }`}
          title="Members"
          aria-label="Members"
          onClick={() => onSectionChange("members")}
        >
          <UsersThree size={20} />
          <span className="group-tab-icon__label">Members</span>
        </button>

        <button
          type="button"
          className={`group-tab group-tab-icon group-tab-icon--expandable ${
            activeSection === "invitations" ? "active" : ""
          }`}
          title="Invitations"
          aria-label="Invitations"
          onClick={() => onSectionChange("invitations")}
        >
          <EnvelopeIcon size={20} />
          <span className="group-tab-icon__label">Invitations</span>
        </button>

        {isCreator && (
          <button
            type="button"
            className={`group-tab group-tab-icon group-tab-icon--expandable ${
              activeSection === "requests" ? "active" : ""
            }`}
            title="Join Requests"
            aria-label="Join Requests"
            onClick={() => onSectionChange("requests")}
          >
            <UserPlus size={20} />
            <span className="group-tab-icon__label">Join Requests</span>
          </button>
        )}
      </div>
    </nav>
  );
}
