import { useEffect, useRef, useState } from "react";
import { Check, X } from "@phosphor-icons/react";

import Avatar from "../../../shared/components/avatar/Avatar.jsx";
import { usePageNavigate } from "../../../shared/components/back-button/usePageBack.js";
import { useToast } from "../../../shared/components/toast/useToast.js";
import { formatLocalDateTime } from "../../../shared/utils/dateTime.js";
import { EVENT_RESPONSE } from "../constants.js";
import { useGroupEvents } from "../hooks/useGroupEvents.js";
import CreateEventModal from "./CreateEventModal.jsx";
import "./GroupEvents.css";

export default function GroupEvents({ groupID, currentUserID }) {
  const navigateTo = usePageNavigate();
  const { error: showError, success: showSuccess } = useToast();
  const loadMoreRef = useRef(null);

  const [showCreateModal, setShowCreateModal] = useState(false);

  const {
    events,
    error,
    status,
    hasMore,
    creating,
    respondingEventID,
    loadMore,
    createEvent,
    respond,
  } = useGroupEvents(groupID);

  const loading = status === "loading";
  const loadingMore = status === "loading-more";

  useEffect(() => {
    if (!error) {
      return;
    }

    showError("Could not load events", error || "Please try again.");
  }, [error, showError]);

  useEffect(() => {
    const target = loadMoreRef.current;

    if (!target || !hasMore) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];

        if (entry.isIntersecting && status === "ready") {
          void loadMore();
        }
      },
      {
        rootMargin: "200px",
      },
    );

    observer.observe(target);

    return () => {
      observer.disconnect();
    };
  }, [hasMore, status, loadMore]);

  async function handleResponse(event, action) {
    const success = await respond(event.id, action);

    if (!success) {
      return;
    }

    if (action === "going") {
      showSuccess("You're going to this event");
    } else {
      showSuccess("Event response updated");
    }
  }

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

            const responding = respondingEventID === event.id;

            const isGoing = event.my_response === EVENT_RESPONSE.GOING;

            const isNotGoing = event.my_response === EVENT_RESPONSE.NOT_GOING;

            return (
              <article key={event.id} className="group-event-card">
                <div className="group-event-creator-row">
                  <button
                    type="button"
                    className="group-event-creator"
                    onClick={() => navigateTo(`/profile/${event.creator_id}`)}
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
                    {isCreator ? (
                      <span className="group-event-owner-label">
                        YOUR EVENT
                      </span>
                    ) : (
                      <div className="group-event-actions">
                        <button
                          type="button"
                          className={`group-event-response-button going ${
                            isGoing ? "active" : ""
                          }`}
                          disabled={responding}
                          onClick={() => handleResponse(event, "going")}
                        >
                          <Check size={18} weight="bold" />
                          Going
                        </button>

                        <button
                          type="button"
                          className={`group-event-response-button not-going ${
                            isNotGoing ? "active" : ""
                          }`}
                          disabled={responding}
                          onClick={() => handleResponse(event, "not_going")}
                        >
                          <X size={18} weight="bold" />
                          Not Going
                        </button>
                      </div>
                    )}

                    <span className="group-event-date">{startsAt}</span>
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
