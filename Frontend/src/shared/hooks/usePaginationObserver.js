import { useEffect, useRef } from "react";

const LOAD_MORE_MARGIN = "200px";

export function usePaginationObserver({ hasMore, status, loadMore }) {
  const loadMoreRef = useRef(null);

  useEffect(() => {
    const target = loadMoreRef.current;

    if (!target || !hasMore) {
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && status === "ready") {
          void loadMore();
        }
      },
      { rootMargin: LOAD_MORE_MARGIN },
    );

    observer.observe(target);

    return () => observer.disconnect();
  }, [hasMore, loadMore, status]);

  return loadMoreRef;
}
