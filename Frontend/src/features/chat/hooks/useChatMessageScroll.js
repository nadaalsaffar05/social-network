import { useCallback, useEffect, useLayoutEffect, useRef } from "react";

const NEAR_BOTTOM_THRESHOLD = 96;

export function useChatMessageScroll(messages, layoutVersion, scrollKey) {
  const messageListRef = useRef(null);
  const pendingBottomScrollRef = useRef(false);
  const prependPositionRef = useRef(null);
  const pendingPrependRestoreRef = useRef(false);
  const wasNearBottomRef = useRef(true);
  const previousLayoutVersionRef = useRef(layoutVersion);
  const previousScrollKeyRef = useRef(scrollKey);

  const isNearBottom = useCallback(() => {
    const container = messageListRef.current;
    if (!container) {
      return false;
    }
    const nearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight <=
      NEAR_BOTTOM_THRESHOLD;
    wasNearBottomRef.current = nearBottom;
    return nearBottom;
  }, []);

  const queueBottomScroll = useCallback(
    ({ force = false } = {}) => {
      if (!force && !isNearBottom()) {
        return false;
      }
      pendingBottomScrollRef.current = true;
      return true;
    },
    [isNearBottom],
  );

  const scrollToBottom = useCallback(() => {
    const container = messageListRef.current;
    if (!container) {
      return;
    }
    container.scrollTop = container.scrollHeight;
    wasNearBottomRef.current = true;
  }, []);
  
  const capturePrependAnchor = useCallback(() => {
    const container = messageListRef.current;
    if (!container) {
      return;
    }
    prependPositionRef.current = {
      scrollHeight: container.scrollHeight,
      scrollTop: container.scrollTop,
    };
  }, []);

  const discardPrependAnchor = useCallback(() => {
    prependPositionRef.current = null;
    pendingPrependRestoreRef.current = false;
  }, []);

  const queuePrependRestore = useCallback(() => {
    if (prependPositionRef.current) {
      pendingPrependRestoreRef.current = true;
    }
  }, []);

  useEffect(() => {
    const container = messageListRef.current;
    if (!container) {
      return undefined;
    }
    const updateNearBottom = () => {
      isNearBottom();
    };
    updateNearBottom();
    container.addEventListener("scroll", updateNearBottom, {
      passive: true,
    });

    return () => {
      container.removeEventListener("scroll", updateNearBottom);
    };
  }, [isNearBottom]);

  useLayoutEffect(() => {
    const container = messageListRef.current;
    if (!container) {
      return;
    }

    const scrollTargetChanged = previousScrollKeyRef.current !== scrollKey;
    previousScrollKeyRef.current = scrollKey;
    if (scrollTargetChanged) {
      pendingBottomScrollRef.current = false;
      prependPositionRef.current = null;
      pendingPrependRestoreRef.current = false;
      wasNearBottomRef.current = true;
      previousLayoutVersionRef.current = layoutVersion;
      return;
    }

    const layoutChanged = previousLayoutVersionRef.current !== layoutVersion;
    previousLayoutVersionRef.current = layoutVersion;
    const prependPosition = prependPositionRef.current;
    if (pendingPrependRestoreRef.current && prependPosition) {
      const addedHeight = container.scrollHeight - prependPosition.scrollHeight;
      container.scrollTop = prependPosition.scrollTop + addedHeight;
      prependPositionRef.current = null;
      pendingPrependRestoreRef.current = false;
      return;
    }

    if (pendingBottomScrollRef.current || (layoutChanged && isNearBottom())) {
      container.scrollTop = container.scrollHeight;
      pendingBottomScrollRef.current = false;
      wasNearBottomRef.current = true;
    }
  }, [isNearBottom, layoutVersion, messages, scrollKey]);

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
