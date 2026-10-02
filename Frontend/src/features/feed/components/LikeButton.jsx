import { useMemo, useOptimistic, useTransition } from "react";
import "./LikeButton.css";

const heartPath =
  "M17.5 1.917A6.4 6.4 0 0 0 12 5.217a6.4 6.4 0 0 0-5.5-3.3A6.8 6.8 0 0 0 0 8.967c0 4.547 4.786 9.513 8.8 12.88a4.974 4.974 0 0 0 6.4 0C19.214 18.48 24 13.514 24 8.967a6.8 6.8 0 0 0-6.5-7.05Z";

export default function LikeButton({
  liked,
  count = 0,
  onClick,
  disabled = false,
}) {
  const baseState = useMemo(() => ({ liked, count }), [liked, count]);
  const [displayState, setOptimisticState] = useOptimistic(
    baseState,
    (_current, next) => next,
  );
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    const nextLiked = !displayState.liked;

    startTransition(async () => {
      setOptimisticState({
        liked: nextLiked,
        count: Math.max(0, displayState.count + (nextLiked ? 1 : -1)),
      });
      await onClick?.();
    });
  }

  return (
    <button
      type="button"
      className={`like-button${displayState.liked ? " like-button--liked" : ""}`}
      onClick={handleClick}
      disabled={disabled || isPending}
      aria-label={displayState.liked ? "Unlike post" : "Like post"}
      aria-pressed={displayState.liked}
    >
      <span className="like-button__heart" aria-hidden="true">
        <svg className="like-button__outline" viewBox="0 0 24 24">
          <path d="M17.5 1.917A6.4 6.4 0 0 0 12 5.217a6.4 6.4 0 0 0-5.5-3.3A6.8 6.8 0 0 0 0 8.967c0 4.547 4.786 9.513 8.8 12.88a4.974 4.974 0 0 0 6.4 0C19.214 18.48 24 13.514 24 8.967a6.8 6.8 0 0 0-6.5-7.05Zm-3.585 18.4a2.973 2.973 0 0 1-3.83 0C4.947 16.006 2 11.87 2 8.967a4.8 4.8 0 0 1 4.5-5.05A4.8 4.8 0 0 1 11 8.967a1 1 0 0 0 2 0 4.8 4.8 0 0 1 4.5-5.05A4.8 4.8 0 0 1 22 8.967c0 2.903-2.947 7.039-8.085 11.346Z" />
        </svg>
        <svg className="like-button__filled" viewBox="0 0 24 24">
          <path d={heartPath} />
        </svg>
        <svg className="like-button__celebrate" viewBox="0 0 100 100">
          <polygon points="10,10 20,20" />
          <polygon points="10,50 20,50" />
          <polygon points="20,80 30,70" />
          <polygon points="90,10 80,20" />
          <polygon points="90,50 80,50" />
          <polygon points="80,80 70,70" />
        </svg>
      </span>
      {displayState.count > 0 && (
        <span className="like-button__count">{displayState.count}</span>
      )}
    </button>
  );
}
