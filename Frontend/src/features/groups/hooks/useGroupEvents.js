import { useCallback, useEffect, useRef, useState } from "react";

import {
  createGroupEvent,
  getGroupEvents,
  respondToGroupEvent,
} from "../../../api/groups.js";
import { EVENT_RESPONSE } from "../../../shared/constants/enums.js";
import { INITIAL_CURSOR, PAGINATION_STATUS } from "./pagination.js";

const EVENTS_LIMIT = 10;

export function useGroupEvents(groupID, { enabled = true } = {}) {
  const [events, setEvents] = useState([]);
  const [nextCursor, setNextCursor] = useState(INITIAL_CURSOR);
  const [status, setStatus] = useState(PAGINATION_STATUS.LOADING);
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(false);
  const [respondingEventID, setRespondingEventID] = useState(null);
  const loadedGroupIDRef = useRef(null);
  const loadingGroupIDRef = useRef(null);
  const refresh = useCallback(async () => {
    setStatus(PAGINATION_STATUS.LOADING);
    setError(null);
    try {
      const { events: nextEvents = [], next_cursor: cursor = INITIAL_CURSOR } =
        await getGroupEvents(groupID, {
          limit: EVENTS_LIMIT,
        });
      setEvents(nextEvents);
      setNextCursor(cursor);
      setStatus(PAGINATION_STATUS.READY);
      loadedGroupIDRef.current = groupID;
      return true;
    } catch (requestError) {
      setError(requestError.message);
      setStatus(PAGINATION_STATUS.ERROR);
      return false;
    }
  }, [groupID]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || status === PAGINATION_STATUS.LOADING_MORE) {
      return;
    }

    setStatus(PAGINATION_STATUS.LOADING_MORE);
    setError(null);

    try {
      const { events: nextEvents = [], next_cursor: cursor = INITIAL_CURSOR } =
        await getGroupEvents(groupID, {
          cursor: nextCursor,
          limit: EVENTS_LIMIT,
        });

      setEvents((currentEvents) => [...currentEvents, ...nextEvents]);

      setNextCursor(cursor);
      setStatus(PAGINATION_STATUS.READY);
    } catch (requestError) {
      setError(requestError.message);
      setStatus(PAGINATION_STATUS.READY);
    }
  }, [groupID, nextCursor, status]);

  const createEvent = useCallback(
    async (title, description, startsAt) => {
      setCreating(true);
      setError(null);

      try {
        await createGroupEvent(groupID, title, description, startsAt);

        await refresh();

        return true;
      } catch (requestError) {
        setError(requestError.message);
        return false;
      } finally {
        setCreating(false);
      }
    },
    [groupID, refresh],
  );

  const respond = useCallback(
    async (eventID, action) => {
      setRespondingEventID(eventID);
      setError(null);

      try {
        await respondToGroupEvent(groupID, eventID, action);

        setEvents((currentEvents) =>
          currentEvents.map((event) => {
            if (event.id !== eventID) return event;

            const wasGoing = event.my_response === EVENT_RESPONSE.GOING;
            const willGo = action === "going";

            return {
              ...event,
              my_response: willGo
                ? EVENT_RESPONSE.GOING
                : EVENT_RESPONSE.NOT_GOING,
              going_count: Math.max(
                0,
                (event.going_count ?? 0) + Number(willGo) - Number(wasGoing),
              ),
            };
          }),
        );

        return true;
      } catch (requestError) {
        setError(requestError.message);
        return false;
      } finally {
        setRespondingEventID(null);
      }
    },
    [groupID],
  );

  useEffect(() => {
    if (
      !enabled ||
      loadedGroupIDRef.current === groupID ||
      loadingGroupIDRef.current === groupID
    ) {
      return;
    }

    loadingGroupIDRef.current = groupID;
    void refresh().finally(() => {
      if (loadingGroupIDRef.current === groupID) {
        loadingGroupIDRef.current = null;
      }
    });
  }, [enabled, groupID, refresh]);

  return {
    events,
    error,
    status,
    hasMore: Boolean(nextCursor),
    creating,
    respondingEventID,
    refresh,
    loadMore,
    createEvent,
    respond,
  };
}
