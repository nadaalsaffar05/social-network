import { useCallback, useEffect, useLayoutEffect, useRef } from "react";

const NEAR_BOTTOM_THRESHOLD = 96;

function findMessageElement(container, messageID) {
  return Array.from(
    container.querySelectorAll("[data-chat-message-id]"),
  ).find((element) => element.dataset.chatMessageId === messageID);
}

export function useChatMessageScroll(messages, layoutVersion) {
  const messageListRef = useRef(null);
  const pendingBottomScrollRef = useRef(false);
  const prependAnchorRef = useRef(null);
  const pendingPrependRestoreRef = useRef(false);
  const wasNearBottomRef = useRef(true);
  const previousLayoutVersionRef = useRef(layoutVersion);

  const isNearBottom = useCallback(() => {
    const container = messageListRef.current;
    if (!container) return false;

    const nearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight <=
      NEAR_BOTTOM_THRESHOLD;
    wasNearBottomRef.current = nearBottom;
    return nearBottom;
  }, []);

  const queueBottomScroll = useCallback(({ force = false } = {}) => {
    if (!force && !isNearBottom()) return false;
    pendingBottomScrollRef.current = true;
    return true;
  }, [isNearBottom]);

  const scrollToBottom = useCallback(() => {
    const container = messageListRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
      wasNearBottomRef.current = true;
    }
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

  useEffect(() => {
    const container = messageListRef.current;
    if (!container) return undefined;

    const updateNearBottom = () => {
      isNearBottom();
    };

    updateNearBottom();
    container.addEventListener("scroll", updateNearBottom, { passive: true });
    return () => container.removeEventListener("scroll", updateNearBottom);
  }, [isNearBottom]);

  useLayoutEffect(() => {
    const container = messageListRef.current;
    if (!container) return;

    const layoutChanged = previousLayoutVersionRef.current !== layoutVersion;
    previousLayoutVersionRef.current = layoutVersion;

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

    if (pendingBottomScrollRef.current || (layoutChanged && wasNearBottomRef.current)) {
      container.scrollTop = container.scrollHeight;
      pendingBottomScrollRef.current = false;
      wasNearBottomRef.current = true;
    }
  }, [layoutVersion, messages]);

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
