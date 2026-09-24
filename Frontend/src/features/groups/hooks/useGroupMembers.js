import { useCallback, useEffect, useState } from "react";
import { getGroupMembers } from "../../../api/groups.js";
import { INITIAL_CURSOR, PAGINATION_STATUS } from "./pagination.js";

const MEMBERS_LIMIT = 10;

export function useGroupMembers(groupID) {
  const [members, setMembers] = useState([]);
  const [nextCursor, setNextCursor] = useState(INITIAL_CURSOR);
  const [status, setStatus] = useState(PAGINATION_STATUS.LOADING);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setStatus(PAGINATION_STATUS.LOADING);
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
      setStatus(PAGINATION_STATUS.READY);
    } catch (requestError) {
      setError(requestError.message);
      setStatus(PAGINATION_STATUS.ERROR);
    }
  }, [groupID]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || status === PAGINATION_STATUS.LOADING_MORE) {
      return;
    }

    setStatus(PAGINATION_STATUS.LOADING_MORE);
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
      setStatus(PAGINATION_STATUS.READY);
    } catch (requestError) {
      setError(requestError.message);
      setStatus(PAGINATION_STATUS.READY);
    }
  }, [groupID, nextCursor, status]);

  useEffect(() => {
    async function loadInitialMembers() {
      await refresh();
    }

    void loadInitialMembers();
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
