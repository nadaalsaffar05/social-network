import { useCallback, useEffect, useState } from "react";

import {
  createGroupEvent,
  getGroupEvents,
  respondToGroupEvent,
} from "../../../api/groups.js";
import { EVENT_RESPONSE } from "../constants.js";

const INITIAL_CURSOR = "";
const EVENTS_LIMIT = 10;

const STATUS = {
  LOADING: "loading",
  LOADING_MORE: "loading-more",
  READY: "ready",
  ERROR: "error",
};

export function useGroupEvents(groupID) {
  const [events, setEvents] = useState([]);
  const [nextCursor, setNextCursor] = useState(INITIAL_CURSOR);
  const [status, setStatus] = useState(STATUS.LOADING);
  const [error, setError] = useState(null);
  const [creating, setCreating] = useState(false);
  const [respondingEventID, setRespondingEventID] = useState(null);
  const refresh = useCallback(async () => {
    setStatus(STATUS.LOADING);
    setError(null);
    try {
      const { events: nextEvents = [], next_cursor: cursor = INITIAL_CURSOR } =
        await getGroupEvents(groupID, {
          limit: EVENTS_LIMIT,
        });
      setEvents(nextEvents);
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
      const { events: nextEvents = [], next_cursor: cursor = INITIAL_CURSOR } =
        await getGroupEvents(groupID, {
          cursor: nextCursor,
          limit: EVENTS_LIMIT,
        });

      setEvents((currentEvents) => [...currentEvents, ...nextEvents]);

      setNextCursor(cursor);
      setStatus(STATUS.READY);
    } catch (requestError) {
      setError(requestError.message);
      setStatus(STATUS.READY);
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
          currentEvents.map((event) =>
            event.id === eventID
              ? {
                  ...event,
                  my_response:
                    action === "going"
                      ? EVENT_RESPONSE.GOING
                      : EVENT_RESPONSE.NOT_GOING,
                }
              : event,
          ),
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
    void refresh();
  }, [refresh]);

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
