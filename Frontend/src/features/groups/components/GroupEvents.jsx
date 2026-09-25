import { useEffect, useState } from "react";

import Avatar from "../../../shared/components/avatar/Avatar.jsx";
import { usePageNavigate } from "../../../shared/components/back-button/usePageBack.js";
import { useToast } from "../../../shared/components/toast/useToast.js";
import { usePaginationObserver } from "../../../shared/hooks/usePaginationObserver.js";
import { formatLocalDateTime } from "../../../shared/utils/dateTime.js";
import { EVENT_RESPONSE } from "../constants.js";
import CreateEventModal from "./CreateEventModal.jsx";
import "./GroupEvents.css";

export default function GroupEvents({
  currentUserID,
  eventsState,
  selectedEventID,
  onSelectEvent,
}) {
  const navigateTo = usePageNavigate();
  const { error: showError } = useToast();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { events, error, status, hasMore, creating, loadMore, createEvent } =
    eventsState;
  const loading = status === "loading";
  const loadingMore = status === "loading-more";
  const loadMoreRef = usePaginationObserver({ hasMore, status, loadMore });

  useEffect(() => {
    if (!error) {
      return;
    }

    showError("Could not load events", error || "Please try again.");
  }, [error, showError]);

  if (loading) {
    return <div className="group-events-state">Loading events...</div>;
  }

  if (status === "error" && events.length === 0) {
    return null;
  }

  return (
    <section className="group-events">
      <div className="group-events-header">
        <span className="group-events-label">UPCOMING EVENTS</span>

        <button
          type="button"
          className="group-events-create-button"
          onClick={() => setShowCreateModal(true)}
        >
          Create Event
        </button>
      </div>

      {events.length === 0 ? (
        <div className="group-events-empty">No upcoming events.</div>
      ) : (
        <div className="group-events-list">
          {events.map((event) => {
            const creatorName =
              `${event.creator_first_name} ${event.creator_last_name}`.trim();

            const startsAt = formatLocalDateTime(event.starts_at, {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "numeric",
              minute: "2-digit",
            });

            const isCreator =
              String(event.creator_id) === String(currentUserID);
            const isGoing = event.my_response === EVENT_RESPONSE.GOING;
            const isNotGoing = event.my_response === EVENT_RESPONSE.NOT_GOING;
            const isSelected = event.id === selectedEventID;

            return (
              <article
                key={event.id}
                className={`group-event-card ${
                  isSelected ? "group-event-card-selected" : ""
                }`}
                onClick={() => onSelectEvent(event.id)}
              >
                <div className="group-event-creator-row">
                  <button
                    type="button"
                    className="group-event-creator"
                    onClick={(clickEvent) => {
                      clickEvent.stopPropagation();
                      navigateTo(`/profile/${event.creator_id}`);
                    }}
                  >
                    <Avatar
                      avatarPath={event.creator_avatar_path}
                      seed={event.creator_id}
                      className="group-event-avatar"
                      alt={creatorName}
                    />

                    <span className="group-event-creator-info">
                      <span className="group-event-creator-name">
                        {creatorName}
                      </span>

                      {event.creator_nickname && (
                        <span className="group-event-creator-nickname">
                          @{event.creator_nickname}
                        </span>
                      )}
                    </span>
                  </button>

                  <div className="group-event-response-area">
                    <span className="group-event-date">{startsAt}</span>
                    {isCreator ? (
                      <span className="group-event-owner-label">
                        YOUR EVENT
                      </span>
                    ) : isGoing ? (
                      <span className="group-event-response-status">GOING</span>
                    ) : isNotGoing ? (
                      <span className="group-event-response-status">
                        NOT GOING
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="group-event-content">
                  <h2 className="group-event-title">{event.title}</h2>

                  {event.description && (
                    <p className="group-event-description">
                      {event.description}
                    </p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {hasMore && (
        <div
          ref={loadMoreRef}
          className="group-events-scroll-trigger"
          aria-hidden="true"
        />
      )}

      {loadingMore && (
        <p className="group-events-loading-more">Loading more events...</p>
      )}

      {showCreateModal && (
        <CreateEventModal
          creating={creating}
          onCreate={createEvent}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </section>
  );
}
