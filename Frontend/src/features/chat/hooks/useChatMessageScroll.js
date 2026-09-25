import { useCallback, useLayoutEffect, useRef } from "react";

const NEAR_BOTTOM_THRESHOLD = 96;

function findMessageElement(container, messageID) {
  return Array.from(
    container.querySelectorAll("[data-chat-message-id]"),
  ).find((element) => element.dataset.chatMessageId === messageID);
}

export function useChatMessageScroll(messages) {
  const messageListRef = useRef(null);
  const pendingBottomScrollRef = useRef(false);
  const prependAnchorRef = useRef(null);
  const pendingPrependRestoreRef = useRef(false);

  const isNearBottom = useCallback(() => {
    const container = messageListRef.current;
    if (!container) return false;

    return (
      container.scrollHeight - container.scrollTop - container.clientHeight <=
      NEAR_BOTTOM_THRESHOLD
    );
  }, []);

  const queueBottomScroll = useCallback(({ force = false } = {}) => {
    if (!force && !isNearBottom()) return false;
    pendingBottomScrollRef.current = true;
    return true;
  }, [isNearBottom]);

  const scrollToBottom = useCallback(() => {
    const container = messageListRef.current;
    if (container) container.scrollTop = container.scrollHeight;
  }, []);

  const capturePrependAnchor = useCallback(() => {
    const container = messageListRef.current;
    const anchor = container?.querySelector("[data-chat-message-id]");
    if (!container || !anchor) return;

    prependAnchorRef.current = {
      messageID: anchor.dataset.chatMessageId,
      top: anchor.getBoundingClientRect().top,
    };
  }, []);

  const discardPrependAnchor = useCallback(() => {
    prependAnchorRef.current = null;
    pendingPrependRestoreRef.current = false;
  }, []);

  const queuePrependRestore = useCallback(() => {
    if (prependAnchorRef.current) pendingPrependRestoreRef.current = true;
  }, []);

  useLayoutEffect(() => {
    const container = messageListRef.current;
    if (!container) return;

    const prependAnchor = prependAnchorRef.current;
    if (pendingPrependRestoreRef.current && prependAnchor) {
      const anchor = findMessageElement(container, prependAnchor.messageID);
      if (anchor) {
        container.scrollTop += anchor.getBoundingClientRect().top - prependAnchor.top;
      }
      prependAnchorRef.current = null;
      pendingPrependRestoreRef.current = false;
      return;
    }

    if (pendingBottomScrollRef.current) {
      container.scrollTop = container.scrollHeight;
      pendingBottomScrollRef.current = false;
    }
  }, [messages]);

  return {
    capturePrependAnchor,
    discardPrependAnchor,
    isNearBottom,
    messageListRef,
    queueBottomScroll,
    queuePrependRestore,
    scrollToBottom,
  };
}
