import { useCallback, useEffect, useState } from "react";

import {
  getGroupMessages,
  sendGroupMessage,
  reactToGroupMessage,
} from "../../../api/groups.js";
import { INITIAL_CURSOR, PAGINATION_STATUS } from "./pagination.js";

const MESSAGES_LIMIT = 20;

function addMessages(
  currentMessages,
  incomingMessages,
  { prepend = false } = {},
) {
  const knownIDs = new Set(currentMessages.map((message) => message.public_id));

  const newMessages = incomingMessages.filter(
    (message) => !knownIDs.has(message.public_id),
  );

  return prepend
    ? [...newMessages, ...currentMessages]
    : [...currentMessages, ...newMessages];
}

export function useGroupChat(groupID) {
  const [messages, setMessages] = useState([]);
  const [nextCursor, setNextCursor] = useState(INITIAL_CURSOR);
  const [status, setStatus] = useState(PAGINATION_STATUS.LOADING);
  const [error, setError] = useState(null);
  const [sending, setSending] = useState(false);

  const refresh = useCallback(async () => {
    setStatus(PAGINATION_STATUS.LOADING);
    setError(null);

    try {
      const {
        messages: nextMessages = [],
        next_cursor: cursor = INITIAL_CURSOR,
      } = await getGroupMessages(groupID, {
        limit: MESSAGES_LIMIT,
      });

      setMessages(nextMessages.slice().reverse());
      setNextCursor(cursor);
      setStatus(PAGINATION_STATUS.READY);
    } catch (requestError) {
      setError(requestError.message);
      setStatus(PAGINATION_STATUS.ERROR);
    }
  }, [groupID]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || status === PAGINATION_STATUS.LOADING_MORE) {
      return false;
    }

    setStatus(PAGINATION_STATUS.LOADING_MORE);
    setError(null);

    try {
      const {
        messages: olderMessages = [],
        next_cursor: cursor = INITIAL_CURSOR,
      } = await getGroupMessages(groupID, {
        cursor: nextCursor,
        limit: MESSAGES_LIMIT,
      });

      const chronologicalMessages = olderMessages.slice().reverse();

      setMessages((currentMessages) =>
        addMessages(currentMessages, chronologicalMessages, {
          prepend: true,
        }),
      );

      setNextCursor(cursor);
      setStatus(PAGINATION_STATUS.READY);
      return true;
    } catch (requestError) {
      setError(requestError.message);
      setStatus(PAGINATION_STATUS.READY);
      return false;
    }
  }, [groupID, nextCursor, status]);

  const sendMessage = useCallback(
    async (content) => {
      const trimmedContent = content.trim();

      if (!trimmedContent || sending) {
        return null;
      }

      setSending(true);
      setError(null);

      try {
        const message = await sendGroupMessage(groupID, trimmedContent);

        setMessages((currentMessages) =>
          addMessages(currentMessages, [message]),
        );

        return message;
      } catch (requestError) {
        setError(requestError.message);
        return null;
      } finally {
        setSending(false);
      }
    },
    [groupID, sending],
  );

  const addMessage = useCallback((message) => {
    setMessages((currentMessages) => addMessages(currentMessages, [message]));
  }, []);

  const updateMessage = useCallback((publicID, changes) => {
    setMessages((currentMessages) =>
      currentMessages.map((message) =>
        message.public_id === publicID
          ? {
              ...message,
              ...changes,
            }
          : message,
      ),
    );
  }, []);

  const reactToMessage = useCallback(
    async (publicID, emoji) => {
      setError(null);

      try {
        const response = await reactToGroupMessage(groupID, publicID, emoji);

        updateMessage(publicID, {
          reactions: response.reactions,
          reaction_summary: response.reaction_summary,
        });

        return true;
      } catch (requestError) {
        setError(requestError.message);
        return false;
      }
    },
    [groupID, updateMessage],
  );

  useEffect(() => {
    async function loadInitialMessages() {
      await refresh();
    }

    void loadInitialMessages();
  }, [refresh]);

  return {
    messages,
    error,
    status,
    hasMore: Boolean(nextCursor),
    sending,
    loadMore,
    sendMessage,
    reactToMessage,
    addMessage,
    updateMessage,
  };
}
