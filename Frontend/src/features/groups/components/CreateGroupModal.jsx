import { useState } from "react";
import { X, UsersThree } from "@phosphor-icons/react";
import { createGroup } from "../../../api/groups";
import { useToast } from "../../../shared/components/toast/useToast.js";
import "./CreateGroupModal.css";

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

  return (
    <div
      className="create-group-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !creating) {
          onClose();
        }
      }}
    >
      <div className="create-group-modal border-glow">
        <form onSubmit={handleSubmit} className="create-group-form">
          <header className="create-group-modal-header">
            <div className="create-group-modal-title">
              <UsersThree size={22} weight="bold" />
              <h2>Create Group</h2>
            </div>

            <button
              type="button"
              className="create-group-close"
              onClick={onClose}
              disabled={creating}
              aria-label="Close create group"
            >
              <X size={20} weight="bold" />
            </button>
          </header>

          <div className="create-group-field">
            <label htmlFor="group-title">Group name</label>

            <input
              id="group-title"
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Give your group a name"
              maxLength={100}
              autoFocus
            />
          </div>

          <div className="create-group-field">
            <label htmlFor="group-description">Description</label>

            <textarea
              id="group-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What is this group about?"
              maxLength={1000}
              rows={5}
            />

            <span className="create-group-character-count">
              {description.length}/1000
            </span>
          </div>

          <footer className="create-group-actions">
            <button
              type="button"
              className="create-group-cancel"
              onClick={onClose}
              disabled={creating}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="create-group-submit"
              disabled={creating || !title.trim() || !description.trim()}
            >
              {creating ? "Creating..." : "Create Group"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}
