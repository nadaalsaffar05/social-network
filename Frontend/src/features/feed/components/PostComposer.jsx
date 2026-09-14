import { useEffect, useRef, useState } from "react";
import {
  Globe,
  ImageSquare,
  LockKey,
  UsersThree,
  X,
} from "@phosphor-icons/react";

import {
  createComment,
  createPost,
  uploadCommentMedia,
  uploadPostMedia,
} from "../../../api/feed.js";
import { getFollowers } from "../../../api/profile.js";
import AnimatedContent from "./AnimatedContent.jsx";
import ClickSpark from "./ClickSpark.jsx";
import GlassSurface from "./GlassSurface.jsx";
import { POST_PRIVACY } from "../../../shared/constants/enums.js";
import "../../../shared/styles/components/PostComposer.css";

const privacyOptions = [
  {
    value: POST_PRIVACY.PUBLIC,
    title: "Public",
    description: "Anyone can see this post",
    icon: Globe,
  },
  {
    value: POST_PRIVACY.FOLLOWERS,
    title: "Followers",
    description: "Only your followers can see it",
    icon: UsersThree,
  },
  {
    value: POST_PRIVACY.SELECTED,
    title: "Selected",
    description: "Only people you choose can see it",
    icon: LockKey,
  },
];

async function uploadFiles(files, uploadFile) {
  await Promise.all(files.map((file, position) => uploadFile(file, position)));
}

export default function PostComposer({
  onCreated,
  postId,
  replyTo,
  open,
  onOpenChange,
}) {
  const fileInputRef = useRef(null);
  const [uncontrolledIsOpen, setUncontrolledIsOpen] = useState(false);
  const [content, setContent] = useState("");
  const [privacy, setPrivacy] = useState(POST_PRIVACY.PUBLIC);
  const [files, setFiles] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [selectedUserIDs, setSelectedUserIDs] = useState([]);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isCommentComposer = Boolean(postId);
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : uncontrolledIsOpen;
  const selectedPrivacy = privacyOptions.find(
    (option) => option.value === privacy,
  );

  function setIsOpen(nextOpen) {
    if (!isControlled) setUncontrolledIsOpen(nextOpen);
    onOpenChange?.(nextOpen);
  }

  useEffect(() => {
    if (
      isCommentComposer ||
      !isOpen ||
      privacy !== POST_PRIVACY.SELECTED ||
      followers.length > 0
    )
      return;

    getFollowers()
      .then(setFollowers)
      .catch(() => setError("Failed to load your followers"));
  }, [followers.length, isCommentComposer, isOpen, privacy]);

  function resetComposer() {
    setIsOpen(false);
    setContent("");
    setPrivacy(POST_PRIVACY.PUBLIC);
    setFiles([]);
    setSelectedUserIDs([]);
    setError("");
  }

  function closeComposer() {
    if (!isSubmitting) resetComposer();
  }

  function toggleSelectedUser(userID) {
    setSelectedUserIDs((currentIDs) =>
      currentIDs.includes(userID)
        ? currentIDs.filter((id) => id !== userID)
        : [...currentIDs, userID],
    );
  }

  function selectFiles(event) {
    setFiles(Array.from(event.target.files ?? []));
    event.target.value = "";
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!content.trim()) {
      setError("Write something before posting");
      return;
    }

    if (
      !isCommentComposer &&
      privacy === POST_PRIVACY.SELECTED &&
      selectedUserIDs.length === 0
    ) {
      setError("Select at least one follower");
      return;
    }

    setIsSubmitting(true);

    try {
      if (isCommentComposer) {
        const comment = await createComment(postId, {
          content: content.trim(),
          ...(replyTo ? { parent_comment_id: replyTo.id } : {}),
        });
        await uploadFiles(files, (file, position) =>
          uploadCommentMedia(postId, comment.id, file, position),
        );
      } else {
        const post = await createPost({
          content: content.trim(),
          privacy,
          ...(privacy === POST_PRIVACY.SELECTED ? { selected_user_ids: selectedUserIDs } : {}),
        });
        await uploadFiles(files, (file, position) =>
          uploadPostMedia(post.id, file, position),
        );
      }

      await onCreated();
      resetComposer();
    } catch (requestError) {
      setError(requestError.message || "Failed to create the post");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      {!isCommentComposer && (
        <GlassSurface
          className="post-launcher-glass"
          width="100%"
          height="auto"
          borderRadius={19}
        >
          <button
            type="button"
            className="post-launcher"
            onClick={() => setIsOpen(true)}
          >
            <span className="post-launcher__plus">+</span>
            <span className="post-launcher__copy">
              <strong>Create a post</strong>
              <small>Share an update, image, or GIF</small>
            </span>
          </button>
        </GlassSurface>
      )}

      {isOpen && (
        <div
          className="post-composer-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeComposer();
          }}
        >
          <AnimatedContent
            distance={28}
            direction="vertical"
            duration={0.45}
            ease="easeOut"
            initialOpacity={0}
            animateOpacity
          >
            <div className="post-composer-surface">
              <form
                className="post-composer"
                onSubmit={handleSubmit}
                aria-label="Create post"
              >
                <header className="post-composer__header">
                  <h2>
                    {isCommentComposer
                      ? replyTo
                        ? `Reply to ${replyTo.author_nickname || "comment"}`
                        : "Add a comment"
                      : "Create a post"}
                  </h2>
                  <button
                    type="button"
                    className="post-composer__close"
                    onClick={closeComposer}
                    disabled={isSubmitting}
                    aria-label="Close post composer"
                  >
                    <X size={20} weight="bold" />
                  </button>
                </header>

                <textarea
                  className="post-composer__textarea"
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  placeholder="What’s on your mind?"
                  maxLength={10000}
                  autoFocus
                />

                <div className="post-composer__attachment-row">
                  <label className="post-composer__attachment-button">
                    <ImageSquare size={21} weight="bold" />
                    <span>
                      <strong>Add image or GIF</strong>
                      <small>JPEG, PNG, or GIF</small>
                    </span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/gif"
                      multiple
                      onChange={selectFiles}
                      disabled={isSubmitting}
                      hidden
                    />
                  </label>

                  {files.length > 0 && (
                    <div
                      className="post-composer__files"
                      aria-label="Selected media"
                    >
                      {files.map((file) => (
                        <span key={`${file.name}-${file.lastModified}`}>
                          {file.name}
                          <button
                            type="button"
                            onClick={() =>
                              setFiles((currentFiles) =>
                                currentFiles.filter(
                                  (currentFile) => currentFile !== file,
                                ),
                              )
                            }
                            disabled={isSubmitting}
                            aria-label={`Remove ${file.name}`}
                          >
                            <X size={15} weight="bold" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {!isCommentComposer && (
                  <section className="post-composer__privacy-section">
                    <h3>Who can see this?</h3>
                    <div className="post-composer__privacy-grid">
                      {privacyOptions.map((option) => {
                        const Icon = option.icon;
                        const isActive = privacy === option.value;

                        return (
                          <button
                            key={option.value}
                            type="button"
                            className={`post-composer__privacy-card${
                              isActive
                                ? " post-composer__privacy-card--active"
                                : ""
                            }`}
                            onClick={() => setPrivacy(option.value)}
                            disabled={isSubmitting}
                            aria-pressed={isActive}
                          >
                            <Icon
                              size={21}
                              weight={isActive ? "fill" : "bold"}
                            />
                            <span>
                              <strong>{option.title}</strong>
                              <small>{option.description}</small>
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {privacy === POST_PRIVACY.SELECTED && (
                      <fieldset className="post-composer__followers">
                        <legend>Select followers</legend>
                        {followers.length === 0 ? (
                          <p>
                            You need at least one follower for this privacy
                            option.
                          </p>
                        ) : (
                          followers.map((follower) => (
                            <label key={follower.id}>
                              <input
                                type="checkbox"
                                checked={selectedUserIDs.includes(follower.id)}
                                onChange={() => toggleSelectedUser(follower.id)}
                                disabled={isSubmitting}
                              />
                              {follower.nickname ||
                                follower.first_name ||
                                follower.email}
                            </label>
                          ))
                        )}
                      </fieldset>
                    )}
                  </section>
                )}

                {error && (
                  <p className="post-composer__error" role="alert">
                    {error}
                  </p>
                )}

                <footer className="post-composer__footer">
                  <span>
                    {isCommentComposer ? (
                      "Replying to this post"
                    ) : (
                      <>
                        Sharing with <strong>{selectedPrivacy.title}</strong>
                      </>
                    )}
                  </span>
                  <div className="post-composer__spark">
                    <ClickSpark
                      sparkColor="#ffffff"
                      sparkSize={10}
                      sparkRadius={25}
                      sparkCount={8}
                      duration={420}
                    >
                      <button
                        type="submit"
                        className="post-composer__submit"
                        disabled={isSubmitting}
                      >
                        {isSubmitting
                          ? "Posting…"
                          : isCommentComposer
                            ? "Post comment"
                            : "Share post"}
                      </button>
                    </ClickSpark>
                  </div>
                </footer>
              </form>
            </div>
          </AnimatedContent>
        </div>
      )}
    </>
  );
}
