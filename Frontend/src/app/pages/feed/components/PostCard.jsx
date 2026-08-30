import { ChatCircle, DotsThree, Trash } from "@phosphor-icons/react";

import LikeButton from "./LikeButton.jsx";
import {
  formatPostTime,
  getMediaUrl,
  getPostDisplayName,
  getPostInitials,
} from "../utils/post.js";
import "./PostCard.css";

export default function PostCard({
  post,
  currentUserID,
  isReacting = false,
  isDeleting = false,
  onLike,
  onComment,
  onDelete,
  onOpen,
  detailedTime = false,
}) {
  const isOwner = post.author_id === currentUserID;

  function handleCardClick(event) {
    if (!onOpen || event.target.closest("button, summary")) return;
    onOpen();
  }

  return (
    <article
      className={`post-card${onOpen ? " post-card--clickable" : ""}`}
      onClick={handleCardClick}
      onKeyDown={(event) => {
        if (onOpen && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          onOpen();
        }
      }}
      role={onOpen ? "link" : undefined}
      tabIndex={onOpen ? 0 : undefined}
    >
      <header className="post-card__header">
        <div className="post-card__author">
          {post.author_avatar_path ? (
            <img
              src={getMediaUrl(post.author_avatar_path)}
              alt=""
              className="post-card__avatar"
            />
          ) : (
            <span
              className="post-card__avatar post-card__avatar--initials"
              aria-hidden="true"
            >
              {getPostInitials(post)}
            </span>
          )}
          <div>
            <strong>{getPostDisplayName(post)}</strong>
            <time dateTime={post.created_at}>
              {formatPostTime(post.created_at, { detailed: detailedTime })}
            </time>
          </div>
        </div>
        {isOwner && (
          <details className="post-card__menu">
            <summary aria-label="Post options">
              <DotsThree size={22} weight="bold" />
            </summary>
            <button type="button" onClick={onDelete} disabled={isDeleting}>
              <Trash size={16} /> {isDeleting ? "Deleting…" : "Delete post"}
            </button>
          </details>
        )}
      </header>

      {post.content && <p className="post-card__content">{post.content}</p>}
      {post.media?.length > 0 && (
        <div className="post-card__media">
          {post.media.map((path, index) => (
            <img
              key={`${post.id}-${path}`}
              src={getMediaUrl(path)}
              alt={`Post media ${index + 1}`}
            />
          ))}
        </div>
      )}
      <footer className="post-card__actions">
        <LikeButton
          liked={post.viewer_reaction === "LIKE"}
          count={post.like_count}
          onClick={onLike}
          disabled={isReacting}
        />
        <button type="button" onClick={onComment}>
          <ChatCircle size={21} />
          <span>Comment</span>
        </button>
      </footer>
    </article>
  );
}
