import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
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
import { POST_PRIVACY } from "../../../shared/constants/enums.js";
import { getUserDisplayName } from "../../../shared/utils/user.js";
import AnimatedContent from "./AnimatedContent.jsx";
import ClickSpark from "./ClickSpark.jsx";
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
  const [content, setContent] = useState("");
  const [privacy, setPrivacy] = useState(POST_PRIVACY.PUBLIC);
  const [files, setFiles] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [selectedUserIDs, setSelectedUserIDs] = useState([]);
  const [step, setStep] = useState(1);
  const [isDraggingMedia, setIsDraggingMedia] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isCommentComposer = Boolean(postId);
  const isOpen = Boolean(open);
  const previews = useMemo(
    () => files.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [files],
  );

  function setIsOpen(nextOpen) {
    onOpenChange(nextOpen);
  }

  useEffect(
    () => () => previews.forEach(({ url }) => URL.revokeObjectURL(url)),
    [previews],
  );

  useEffect(() => {
    if (
      isCommentComposer ||
      !isOpen ||
      privacy !== POST_PRIVACY.SELECTED ||
      followers.length > 0
    ) {
      return;
    }

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
    setStep(1);
    setError("");
  }

  function closeComposer() {
    if (!isSubmitting) resetComposer();
  }

  function addFiles(nextFiles) {
    const receivedFiles = Array.from(nextFiles ?? []);
    if (receivedFiles.length > 0) {
      setFiles((currentFiles) => [...currentFiles, ...receivedFiles]);
    }
  }

  function toggleSelectedUser(userID) {
    setSelectedUserIDs((currentIDs) =>
      currentIDs.includes(userID)
        ? currentIDs.filter((id) => id !== userID)
        : [...currentIDs, userID],
    );
  }

  function continueToPrivacy() {
    if (!content.trim()) {
      setError("Write something before posting");
      return;
    }
    setError("");
    setStep(2);
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
          ...(privacy === POST_PRIVACY.SELECTED
            ? { selected_user_ids: selectedUserIDs }
            : {}),
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
              <form className="post-composer" onSubmit={handleSubmit}>
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

                {!isCommentComposer && (
                  <ol className="post-composer__steps" aria-label="Post steps">
                    <li
                      className={`post-composer__step${
                        step === 2
                          ? " post-composer__step--complete"
                          : " post-composer__step--active"
                      }`}
                    >
                      <span>{step === 2 ? "✓" : "1"}</span>
                    </li>
                    <li
                      className={`post-composer__step${step === 2 ? " post-composer__step--active" : ""}`}
                    >
                      <span>2</span>
                    </li>
                  </ol>
                )}

                {(isCommentComposer || step === 1) && (
                  <>
                    <div className="post-composer__attachment-row">
                      <label
                        className={`post-composer__attachment-button${
                          isDraggingMedia
                            ? " post-composer__attachment-button--dragging"
                            : ""
                        }`}
                        onDragEnter={() => setIsDraggingMedia(true)}
                        onDragOver={(event) => event.preventDefault()}
                        onDragLeave={() => setIsDraggingMedia(false)}
                        onDrop={(event) => {
                          event.preventDefault();
                          setIsDraggingMedia(false);
                          addFiles(event.dataTransfer.files);
                        }}
                      >
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/gif"
                          multiple
                          onChange={(event) => {
                            addFiles(event.target.files);
                            event.target.value = "";
                          }}
                          disabled={isSubmitting}
                          hidden
                        />
                        <ImageSquare size={21} weight="bold" />
                        <span>
                          <strong>Drop image or GIF</strong>
                          <small>or choose a JPEG, PNG, or GIF</small>
                        </span>
                      </label>
                      {previews.length > 0 && (
                        <div
                          className="post-composer__previews"
                          aria-label="Selected media"
                        >
                          {previews.map(({ file, url }) => (
                            <figure key={`${file.name}-${file.lastModified}`}>
                              <img src={url} alt={`Preview of ${file.name}`} />
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
                            </figure>
                          ))}
                        </div>
                      )}
                    </div>
                    <textarea
                      id="post-content"
                      className="post-composer__textarea"
                      value={content}
                      onChange={(event) => setContent(event.target.value)}
                      placeholder={
                        isCommentComposer
                          ? "Write a comment…"
                          : "What’s on your mind?"
                      }
                      maxLength={10000}
                      autoFocus
                    />
                  </>
                )}

                {!isCommentComposer && step === 2 && (
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
                              {getUserDisplayName(follower, follower.email)}
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
                  {!isCommentComposer && step === 2 ? (
                    <button
                      type="button"
                      className="post-composer__back"
                      onClick={() => setStep(1)}
                    >
                      <ArrowLeft size={16} /> Previous
                    </button>
                  ) : (
                    <span>
                      {isCommentComposer ? "Replying to this post" : ""}
                    </span>
                  )}
                  {isCommentComposer ? (
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
                        {isSubmitting ? "Posting…" : "Post comment"}
                      </button>
                    </ClickSpark>
                  ) : step === 1 ? (
                    <button
                      type="button"
                      className="post-composer__submit"
                      onClick={continueToPrivacy}
                    >
                      Next
                    </button>
                  ) : (
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
                        {isSubmitting ? "Posting…" : "Share post"}
                      </button>
                    </ClickSpark>
                  )}
                </footer>
              </form>
            </div>
          </AnimatedContent>
        </div>
      )}
    </>
  );
}
