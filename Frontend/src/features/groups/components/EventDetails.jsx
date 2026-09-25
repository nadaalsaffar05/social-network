import { Check, X } from "@phosphor-icons/react";

import Avatar from "../../../shared/components/avatar/Avatar.jsx";
import { usePageNavigate } from "../../../shared/components/back-button/usePageBack.js";
import { useToast } from "../../../shared/components/toast/useToast.js";
import { formatLocalDateTime } from "../../../shared/utils/dateTime.js";
import { EVENT_RESPONSE } from "../constants.js";

import "./DetailsCard.css";

export default function EventDetails({
  event,
  currentUserID,
  respondingEventID,
  onRespond,
  onClose,
}) {
  const navigateTo = usePageNavigate();
  const { error: showError, success: showSuccess } = useToast();
  const creatorName =
    `${event.creator_first_name} ${event.creator_last_name}`.trim();
  const startsAt = formatLocalDateTime(event.starts_at, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  const isCreator = String(event.creator_id) === String(currentUserID);
  const responding = respondingEventID === event.id;
  const isGoing = event.my_response === EVENT_RESPONSE.GOING;
  const isNotGoing = event.my_response === EVENT_RESPONSE.NOT_GOING;

  async function handleResponse(action) {
    const success = await onRespond(event.id, action);

    if (!success) {
      showError("Could not update response", "Please try again.");
      return;
    }

    if (action === "going") {
      showSuccess("You're going to this event");
    } else {
      showSuccess("Event response updated");
    }
  }

  return (
    <aside className="details-card event-details">
      <div className="event-details-header">
        <span className="details-label">Event Details</span>

        <button
          type="button"
          className="event-details-close"
          onClick={onClose}
          aria-label="Close event details"
        >
          <X size={16} weight="bold" />
        </button>
      </div>

      <div className="details-field">
        <span className="details-label">Created By</span>

        <button
          type="button"
          className="event-details-creator"
          onClick={() => navigateTo(`/profile/${event.creator_id}`)}
        >
          <Avatar
            avatarPath={event.creator_avatar_path}
            seed={event.creator_id}
            className="event-details-avatar"
            alt={creatorName}
          />

          <span className="event-details-creator-info">
            <span className="event-details-creator-name">{creatorName}</span>

            {event.creator_nickname && (
              <span className="event-details-creator-nickname">
                @{event.creator_nickname}
              </span>
            )}
          </span>
        </button>
      </div>

      <div className="details-field">
        <span className="details-label">Event</span>
        <h2 className="details-title">{event.title}</h2>
      </div>

      <div className="details-field">
        <span className="details-label">Date & Time</span>
        <p>{startsAt}</p>
      </div>

      <div className="details-field">
        <span className="details-label">Description</span>
        <p className="details-description">{event.description}</p>
      </div>

      <div className="details-actions">
        {isCreator ? (
          <span className="event-details-owner-label">YOUR EVENT</span>
        ) : (
          <>
            <button
              type="button"
              className={isGoing ? "event-response-active" : ""}
              disabled={responding}
              onClick={() => handleResponse("going")}
            >
              <Check size={17} weight="bold" />
              Going
            </button>

            <button
              type="button"
              className={isNotGoing ? "event-response-active" : ""}
              disabled={responding}
              onClick={() => handleResponse("not_going")}
            >
              <X size={17} weight="bold" />
              Not Going
            </button>
          </>
        )}
      </div>
    </aside>
  );
}
