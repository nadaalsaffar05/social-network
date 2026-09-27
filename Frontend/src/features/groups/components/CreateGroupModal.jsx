import { useState } from "react";
import { createPortal } from "react-dom";
import { X, UsersThree } from "@phosphor-icons/react";
import { createGroup } from "../../../api/groups";
import { useToast } from "../../../shared/components/toast/useToast.js";

export default function CreateGroupModal({ onClose, onCreated }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);
  const { error: showError, success: showSuccess } = useToast();

  async function handleSubmit(event) {
    event.preventDefault();

    if (!title.trim()) {
      showError("Could not create group", "Title is required");
      return;
    }

    if (!description.trim()) {
      showError("Could not create group", "Description is required");
      return;
    }

    try {
      setCreating(true);

      const group = await createGroup(title.trim(), description.trim());

      showSuccess("Group created");

      onCreated(group);
      onClose();
    } catch (requestError) {
      showError(
        "Could not create group",
        requestError.message || "Please try again.",
      );
    } finally {
      setCreating(false);
    }
  }

  return createPortal(
    <div
      className="loop-glass-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !creating) {
          onClose();
        }
      }}
    >
      <div className="creation-modal loop-glass-surface">
        <form onSubmit={handleSubmit} className="loop-form">
          <header className="creation-modal__header">
            <div className="creation-modal__title">
              <UsersThree size={22} weight="bold" />
              <h2>Create Group</h2>
            </div>

            <button
              type="button"
              className="loop-icon-button"
              onClick={onClose}
              disabled={creating}
              aria-label="Close create group"
            >
              <X size={20} weight="bold" />
            </button>
          </header>

          <div className="loop-form__field">
            <label htmlFor="group-title">Group name</label>

            <input
              id="group-title"
              className="loop-form__control"
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Give your group a name"
              maxLength={100}
              autoFocus
            />
          </div>

          <div className="loop-form__field">
            <label htmlFor="group-description">Description</label>

            <textarea
              id="group-description"
              className="loop-form__control"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What is this group about?"
              maxLength={1000}
              rows={5}
            />

            <span className="creation-modal__count">
              {description.length}/1000
            </span>
          </div>

          <footer className="loop-form__footer loop-form__footer--stack-on-mobile">
            <button
              type="button"
              className="loop-button loop-button--secondary"
              onClick={onClose}
              disabled={creating}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="loop-button loop-button--primary"
              disabled={creating || !title.trim() || !description.trim()}
            >
              {creating ? "Creating..." : "Create Group"}
            </button>
          </footer>
        </form>
      </div>
    </div>,
    document.body,
  );
}
