import { useCallback, useEffect, useState } from "react";

import { getJoinRequests, respondToJoinRequest } from "../../../api/groups.js";

const INITIAL_CURSOR = "";
const REQUESTS_LIMIT = 10;

const STATUS = {
  LOADING: "loading",
  LOADING_MORE: "loading-more",
  READY: "ready",
  ERROR: "error",
};

export function useGroupJoinRequests(groupID) {
  const [requests, setRequests] = useState([]);
  const [nextCursor, setNextCursor] = useState(INITIAL_CURSOR);
  const [status, setStatus] = useState(STATUS.LOADING);
  const [error, setError] = useState(null);
  const [respondingRequestID, setRespondingRequestID] = useState(null);
  const [total, setTotal] = useState(0);

  const refresh = useCallback(async () => {
    setStatus(STATUS.LOADING);
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
        requests: nextRequests = [],
        next_cursor: cursor = INITIAL_CURSOR,
      } = await getJoinRequests(groupID, {
        cursor: nextCursor,
        limit: REQUESTS_LIMIT,
      });

      setRequests((currentRequests) => [...currentRequests, ...nextRequests]);

      setNextCursor(cursor);
      setStatus(STATUS.READY);
    } catch (requestError) {
      setError(requestError.message);
      setStatus(STATUS.READY);
    }
  }, [groupID, nextCursor, status]);

  const respond = useCallback(
    async (requestID, action) => {
      setRespondingRequestID(requestID);
      setError(null);

      try {
        await respondToJoinRequest(groupID, requestID, action);

        setRequests(
          (currentRequests) =>
            currentRequests.filter(
              (request) => request.request_id !== requestID,
            ),
          setTotal((currentTotal) => Math.max(0, currentTotal - 1)),
        );

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
    void refresh();
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
