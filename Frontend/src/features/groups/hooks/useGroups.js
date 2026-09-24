import { useCallback, useEffect, useState } from "react";
import { getGroups } from "../../../api/groups.js";

const INITIAL_CURSOR = "";

const STATUS = {
  LOADING: "loading",
  LOADING_MORE: "loading-more",
  READY: "ready",
  ERROR: "error",
};

export function useGroups(filter) {
  const [groups, setGroups] = useState([]);
  const [nextCursor, setNextCursor] = useState(INITIAL_CURSOR);
  const [status, setStatus] = useState(STATUS.LOADING);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setStatus(STATUS.LOADING);
    setError(null);

    try {
      const { groups: nextGroups = [], next_cursor: cursor = INITIAL_CURSOR } =
        await getGroups({
          filter,
          limit: 15,
        });

      setGroups(nextGroups);
      setNextCursor(cursor);
      setStatus(STATUS.READY);
    } catch (requestError) {
      setError(requestError.message);
      setStatus(STATUS.ERROR);
    }
  }, [filter]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || status === STATUS.LOADING_MORE) {
      return;
    }

    setStatus(STATUS.LOADING_MORE);
    setError(null);

    try {
      const { groups: nextGroups = [], next_cursor: cursor = INITIAL_CURSOR } =
        await getGroups({
          filter,
          limit: 15,
          cursor: nextCursor,
        });

      setGroups((currentGroups) => [...currentGroups, ...nextGroups]);

      setNextCursor(cursor);
      setStatus(STATUS.READY);
    } catch (requestError) {
      setError(requestError.message);
      setStatus(STATUS.READY);
    }
  }, [filter, nextCursor, status]);

  useEffect(() => {
    async function loadInitialGroups() {
      await refresh();
    }

    void loadInitialGroups();
  }, [refresh]);

  return {
    groups,
    setGroups,
    error,
    status,
    hasMore: Boolean(nextCursor),
    refresh,
    loadMore,
  };
}
