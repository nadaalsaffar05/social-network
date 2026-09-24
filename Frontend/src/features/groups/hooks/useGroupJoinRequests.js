import { useCallback, useEffect, useState } from "react";

import { getJoinRequests, respondToJoinRequest } from "../../../api/groups.js";
import { INITIAL_CURSOR, PAGINATION_STATUS } from "./pagination.js";

const REQUESTS_LIMIT = 10;

export function useGroupJoinRequests(groupID) {
  const [requests, setRequests] = useState([]);
  const [nextCursor, setNextCursor] = useState(INITIAL_CURSOR);
  const [status, setStatus] = useState(PAGINATION_STATUS.LOADING);
  const [error, setError] = useState(null);
  const [respondingRequestID, setRespondingRequestID] = useState(null);
  const [total, setTotal] = useState(0);

  const refresh = useCallback(async () => {
    setStatus(PAGINATION_STATUS.LOADING);
    setError(null);

    try {
      const {
        requests: nextRequests = [],
        next_cursor: cursor = INITIAL_CURSOR,
        total: nextTotal = 0,
      } = await getJoinRequests(groupID, {
        limit: REQUESTS_LIMIT,
      });

      setRequests(nextRequests);
      setNextCursor(cursor);
      setTotal(nextTotal);
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
        requests: nextRequests = [],
        next_cursor: cursor = INITIAL_CURSOR,
      } = await getJoinRequests(groupID, {
        cursor: nextCursor,
        limit: REQUESTS_LIMIT,
      });

      setRequests((currentRequests) => [...currentRequests, ...nextRequests]);

      setNextCursor(cursor);
      setStatus(PAGINATION_STATUS.READY);
    } catch (requestError) {
      setError(requestError.message);
      setStatus(PAGINATION_STATUS.READY);
    }
  }, [groupID, nextCursor, status]);

  const respond = useCallback(
    async (requestID, action) => {
      setRespondingRequestID(requestID);
      setError(null);

      try {
        await respondToJoinRequest(groupID, requestID, action);

        setRequests((currentRequests) =>
          currentRequests.filter((request) => request.request_id !== requestID),
        );
        setTotal((currentTotal) => Math.max(0, currentTotal - 1));

        return true;
      } catch (requestError) {
        setError(requestError.message);
        return false;
      } finally {
        setRespondingRequestID(null);
      }
    },
    [groupID],
  );

  useEffect(() => {
    async function loadInitialRequests() {
      await refresh();
    }

    void loadInitialRequests();
  }, [refresh]);

  return {
    requests,
    total,
    error,
    status,
    hasMore: Boolean(nextCursor),
    respondingRequestID,
    refresh,
    loadMore,
    respond,
  };
}
