import { useState } from "react";
import { CalendarDots, X } from "@phosphor-icons/react";
import { createPortal } from "react-dom";

import { useToast } from "../../../shared/components/toast/useToast.js";

export default function CreateEventModal({ creating, onClose, onCreate }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const { error: showError, success: showSuccess } = useToast();

  async function handleSubmit(event) {
    event.preventDefault();

    if (!title.trim()) {
      showError("Could not create event", "Title is required");
      return;
    }

    if (!description.trim()) {
      showError("Could not create event", "Description is required");
      return;
    }

    if (!startsAt) {
      showError("Could not create event", "Start date and time are required");
      return;
    }

    const startDate = new Date(startsAt);

    if (Number.isNaN(startDate.getTime())) {
      showError("Could not create event", "Start date and time are invalid");
      return;
    }

    if (startDate <= new Date()) {
      showError("Could not create event", "Event must start in the future");
      return;
    }

    const success = await onCreate(
      title.trim(),
      description.trim(),
      startDate.toISOString(),
    );

    if (!success) {
      return;
    }

    showSuccess("Event created");
    onClose();
  }

  return createPortal(
    <div
      className="create-event-overlay loop-glass-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !creating) {
          onClose();
        }
      }}
    >
      <div className="create-event-modal creation-modal loop-glass-surface">
        <form onSubmit={handleSubmit} className="create-event-form loop-form">
          <header className="create-event-modal-header creation-modal__header">
            <div className="create-event-modal-title creation-modal__title">
              <CalendarDots size={22} weight="bold" />
              <h2>Create Event</h2>
            </div>

            <button
              type="button"
              className="create-event-close loop-icon-button"
              onClick={onClose}
              disabled={creating}
              aria-label="Close create event"
            >
              <X size={20} weight="bold" />
            </button>
          </header>

          <div className="create-event-field loop-form__field">
            <label htmlFor="event-title">Event name</label>

            <input
              id="event-title"
              className="loop-form__control"
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Give your event a name"
              maxLength={100}
              disabled={creating}
              autoFocus
            />
          </div>

          <div className="create-event-field loop-form__field">
            <label htmlFor="event-description">Description</label>

            <textarea
              id="event-description"
              className="loop-form__control"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What is this event about?"
              maxLength={1000}
              rows={5}
              disabled={creating}
            />

            <span className="create-event-character-count creation-modal__count">
              {description.length}/1000
            </span>
          </div>

          <div className="create-event-field loop-form__field">
            <label htmlFor="event-starts-at">Starts at</label>

            <input
              id="event-starts-at"
              className="loop-form__control"
              type="datetime-local"
              value={startsAt}
              onChange={(event) => setStartsAt(event.target.value)}
              disabled={creating}
            />
          </div>

          <footer className="create-event-actions loop-form__footer loop-form__footer--stack-on-mobile">
            <button
              type="button"
              className="create-event-cancel loop-button loop-button--secondary"
              onClick={onClose}
              disabled={creating}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="create-event-submit loop-button loop-button--primary"
              disabled={
                creating || !title.trim() || !description.trim() || !startsAt
              }
            >
              {creating ? "Creating..." : "Create Event"}
            </button>
          </footer>
        </form>
      </div>
    </div>,
    document.body,
  );
}
