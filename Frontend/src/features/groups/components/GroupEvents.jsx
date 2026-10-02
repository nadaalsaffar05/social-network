import { useEffect, useState } from "react";
import { CalendarBlank, Check, X } from "@phosphor-icons/react";

import Avatar from "../../../shared/components/avatar/Avatar.jsx";
import { usePageNavigate } from "../../../shared/components/back-button/usePageBack.js";
import { useToast } from "../../../shared/components/toast/useToast.js";
import {
  formatLocalDate,
  formatLocalTime,
} from "../../../shared/utils/dateTime.js";
import { usePaginationObserver } from "../../../shared/hooks/usePaginationObserver.js";
import { EVENT_RESPONSE } from "../../../shared/constants/enums.js";
import CreateEventModal from "./CreateEventModal.jsx";
import EventDescription from "./EventDescription.jsx";
import { GroupEventsSkeleton } from "./GroupSectionSkeletons.jsx";
import "./GroupEvents.css";

export default function GroupEvents({
  currentUserID,
  eventsState,
}) {
  const navigateTo = usePageNavigate();
  const { error: showError, success: showSuccess } = useToast();
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
  } = eventsState;
  const loading = status === "loading";
  const loadingMore = status === "loading-more";
  const loadMoreRef = usePaginationObserver({ hasMore, status, loadMore });

  useEffect(() => {
    if (!error) {
      return;
    }

    showError("Could not load events", error || "Please try again.");
  }, [error, showError]);

  async function handleResponse(event, action) {
    const success = await respond(event.id, action);
    if (!success) return;

    showSuccess(
      action === "going" ? "You're going to this event" : "Event response updated",
    );
  }

  if (loading) {
    return <GroupEventsSkeleton />;
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

            const startsAt = `${formatLocalDate(event.starts_at, {
              weekday: "short",
              day: "numeric",
              month: "short",
              year: "numeric",
            })} • ${formatLocalTime(event.starts_at, {
              hour: "numeric",
              minute: "2-digit",
            })}`;

            const month = formatLocalDate(event.starts_at, {
              month: "short",
            }).toUpperCase();
            const day = formatLocalDate(event.starts_at, {
              day: "2-digit",
            });
            const weekday = formatLocalDate(event.starts_at, {
              weekday: "short",
            }).toUpperCase();

            const isCreator =
              String(event.creator_id) === String(currentUserID);
            const isGoing = event.my_response === EVENT_RESPONSE.GOING;
            const isNotGoing = event.my_response === EVENT_RESPONSE.NOT_GOING;
            const responding = respondingEventID === event.id;

            return (
              <article
                key={event.id}
                className="group-event-card"
              >
                <time
                  className="group-event-date-block"
                  dateTime={event.starts_at}
                  aria-label={startsAt}
                >
                  <span className="group-event-date-block__month">{month}</span>
                  <strong className="group-event-date-block__day">{day}</strong>
                  <span className="group-event-date-block__weekday">
                    {weekday}
                  </span>
                </time>

                <div className="group-event-details">
                  <h2 className="group-event-title">{event.title}</h2>

                  <p className="group-event-starts-at">
                    <CalendarBlank size={18} weight="bold" aria-hidden="true" />
                    <span>{startsAt}</span>
                  </p>

                  <p className="group-event-going-count">
                    {event.going_count ?? 0} going
                  </p>

                  {event.description && (
                    <EventDescription
                      eventID={event.id}
                      description={event.description}
                    />
                  )}

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
                </div>

                <div className="group-event-rsvp">
                  {isCreator ? (
                    <span className="group-event-owner-label">YOUR EVENT</span>
                  ) : (
                    <div className="group-event-actions">
                      <button
                        type="button"
                        className={`group-event-response-button going ${
                          isGoing ? "active" : ""
                        }`}
                        disabled={responding}
                        onClick={() => void handleResponse(event, "going")}
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
                        onClick={() => void handleResponse(event, "not_going")}
                      >
                        <X size={18} weight="bold" />
                        Not Going
                      </button>
                    </div>
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
        <GroupEventsSkeleton count={1} pagination />
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
