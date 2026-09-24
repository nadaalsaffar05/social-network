import { useCallback, useEffect, useState } from "react";
import { getGroupMembers } from "../../../api/groups.js";

const INITIAL_CURSOR = "";
const MEMBERS_LIMIT = 10;

const STATUS = {
  LOADING: "loading",
  LOADING_MORE: "loading-more",
  READY: "ready",
  ERROR: "error",
};

export function useGroupMembers(groupID) {
  const [members, setMembers] = useState([]);
  const [nextCursor, setNextCursor] = useState(INITIAL_CURSOR);
  const [status, setStatus] = useState(STATUS.LOADING);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setStatus(STATUS.LOADING);
    setError(null);

    try {
      const {
        members: nextMembers = [],
        next_cursor: cursor = INITIAL_CURSOR,
      } = await getGroupMembers(groupID, {
        limit: MEMBERS_LIMIT,
      });

      setMembers(nextMembers);
      setNextCursor(cursor);
      setStatus(STATUS.READY);
    } catch (requestError) {
      setError(requestError.message);
      setStatus(STATUS.ERROR);
    }
  }, [groupID]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || status === STATUS.LOADING_MORE) {
      return;
    }

    setStatus(STATUS.LOADING_MORE);
    setError(null);

    try {
      const {
        members: nextMembers = [],
        next_cursor: cursor = INITIAL_CURSOR,
      } = await getGroupMembers(groupID, {
        cursor: nextCursor,
        limit: MEMBERS_LIMIT,
      });

      setMembers((currentMembers) => [...currentMembers, ...nextMembers]);

      setNextCursor(cursor);
      setStatus(STATUS.READY);
    } catch (requestError) {
      setError(requestError.message);
      setStatus(STATUS.READY);
    }
  }, [groupID, nextCursor, status]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    members,
    error,
    status,
    hasMore: Boolean(nextCursor),
    refresh,
    loadMore,
  };
}
