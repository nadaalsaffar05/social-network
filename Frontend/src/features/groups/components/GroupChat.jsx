import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { PaperPlaneTilt, Smiley } from "@phosphor-icons/react";

import { useToast } from "../../../shared/components/toast/useToast.js";
import {
  formatLocalDate,
  formatLocalTime,
  isSameLocalDay,
  parseAPITimestamp,
} from "../../../shared/utils/dateTime.js";
import ChatEmojiPicker from "../../chat/components/ChatEmojiPicker.jsx";
import MessageReactions from "../../chat/components/MessageReactions.jsx";
import { useChatMessageScroll } from "../../chat/hooks/useChatMessageScroll.js";
import { useChatRealtime } from "../../chat/realtime/useChatRealtime.js";
import { useGroupChat } from "../hooks/useGroupChat.js";

import "../../chat/ChatPage.css";
import "./GroupChat.css";

function messageTime(value) {
  return formatLocalTime(value, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function messageDay(value) {
  const date = parseAPITimestamp(value);

  if (!date) {
    return value;
  }

  const today = new Date();
  const yesterday = new Date();

  yesterday.setDate(today.getDate() - 1);

  if (isSameLocalDay(date, today)) {
    return "Today";
  }

  if (isSameLocalDay(date, yesterday)) {
    return "Yesterday";
  }

  return formatLocalDate(value, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function senderName(message) {
  if (message.sender_nickname) {
    return message.sender_nickname;
  }

  return `${message.sender_first_name} ${message.sender_last_name}`.trim();
}

function typingText(typers) {
  if (typers.length === 0) {
    return "";
  }

  const names = typers.map((user) => {
    if (user.nickname) {
      return user.nickname;
    }

    return `${user.first_name} ${user.last_name}`.trim();
  });

  if (names.length === 1) {
    return `${names[0]} is typing`;
  }

  if (names.length === 2) {
    return `${names[0]} and ${names[1]} are typing`;
  }

  return `${names[0]}, ${names[1]} and ${names.length - 2} others are typing`;
}

export default function GroupChat({ groupID, groupTitle, currentUserID }) {
  const { error: showError } = useToast();
  const { events, sendEvent } = useChatRealtime();
  const {
    messages,
    error,
    status,
    hasMore,
    sending,
    loadMore,
    sendMessage,
    reactToMessage,
    addMessage,
    updateMessage,
  } = useGroupChat(groupID);
  const typingTimerRef = useRef(null);
  const hasPositionedInitialMessagesRef = useRef(false);
  const shouldForceBottomOnNextMessageRef = useRef(false);
  const composerInputRef = useRef(null);
  const composerEmojiRef = useRef(null);
  const [content, setContent] = useState("");
  const [typers, setTypers] = useState([]);
  const [isComposerEmojiPickerOpen, setIsComposerEmojiPickerOpen] =
    useState(false);
  const [reactionTargetID, setReactionTargetID] = useState("");
  const [quickReactionTargetID, setQuickReactionTargetID] = useState("");
  const loading = status === "loading";
  const loadingMore = status === "loading-more";
  const {
    capturePrependAnchor,
    discardPrependAnchor,
    messageListRef,
    queueBottomScroll,
    queuePrependRestore,
    scrollToBottom,
  } = useChatMessageScroll(messages, typers.length > 0);

  useEffect(() => {
    hasPositionedInitialMessagesRef.current = false;
    discardPrependAnchor();
  }, [discardPrependAnchor, groupID]);

  useLayoutEffect(() => {
    if (loading) {
      return;
    }

    if (shouldForceBottomOnNextMessageRef.current) {
      scrollToBottom();
      shouldForceBottomOnNextMessageRef.current = false;
      hasPositionedInitialMessagesRef.current = true;
      return;
    }

    if (hasPositionedInitialMessagesRef.current) {
      return;
    }

    scrollToBottom();
    hasPositionedInitialMessagesRef.current = true;
  }, [loading, messages, scrollToBottom]);

  useEffect(() => {
    if (!error) {
      return;
    }

    showError("Could not update group chat", error || "Please try again.");
  }, [error, showError]);

  useEffect(() => {
    const event = events.at(-1);

    if (!event || event.data?.group_id !== groupID) {
      return;
    }

    if (event.type === "group-message:new") {
      queueBottomScroll();
      addMessage(event.data);

      if (event.data.sender_id !== currentUserID) {
        sendEvent("group-message:read", {
          group_id: groupID,
          public_id: event.data.public_id,
        });
      }

      return;
    }

    if (event.type === "group-message:reaction") {
      updateMessage(event.data.public_id, {
        reactions: event.data.reactions,
        reaction_summary: event.data.reaction_summary,
      });

      return;
    }

    if (event.type === "group-message:read") {
      updateMessage(event.data.public_id, {
        read_count: event.data.read_count,
        read_by: event.data.read_by,
      });

      return;
    }

    if (event.type === "group-typing") {
      const timer = window.setTimeout(() => {
        setTypers(
          (event.data.typers ?? []).filter((user) => user.id !== currentUserID),
        );
      }, 0);

      return () => window.clearTimeout(timer);
    }
  }, [
    events,
    groupID,
    currentUserID,
    addMessage,
    queueBottomScroll,
    updateMessage,
    sendEvent,
  ]);

  useEffect(() => {
    if (loading) {
      return;
    }

    messages.forEach((message) => {
      if (message.sender_id === currentUserID) {
        return;
      }

      sendEvent("group-message:read", {
        group_id: groupID,
        public_id: message.public_id,
      });
    });
  }, [loading, messages, currentUserID, groupID, sendEvent]);

  useEffect(
    () => () => {
      window.clearTimeout(typingTimerRef.current);

      sendEvent("group-typing", {
        group_id: groupID,
        is_typing: false,
      });
    },
    [groupID, sendEvent],
  );

  useEffect(() => {
    if (!isComposerEmojiPickerOpen) {
      return undefined;
    }

    function closeOnOutsidePress(event) {
      if (!composerEmojiRef.current?.contains(event.target)) {
        setIsComposerEmojiPickerOpen(false);
      }
    }

    function closeOnEscape(event) {
      if (event.key === "Escape") {
        setIsComposerEmojiPickerOpen(false);
      }
    }

    document.addEventListener("pointerdown", closeOnOutsidePress);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePress);

      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isComposerEmojiPickerOpen]);

  async function handleSubmit(event) {
    event.preventDefault();

    const text = content.trim();

    if (!text || sending) {
      return;
    }

    shouldForceBottomOnNextMessageRef.current = true;
    const message = await sendMessage(text);

    if (!message) {
      shouldForceBottomOnNextMessageRef.current = false;
      return;
    }

    setContent("");
    window.clearTimeout(typingTimerRef.current);

    sendEvent("group-typing", {
      group_id: groupID,
      is_typing: false,
    });
  }

  function updateDraft(nextContent) {
    setContent(nextContent);

    const isTyping = nextContent.trim() !== "";

    sendEvent("group-typing", {
      group_id: groupID,
      is_typing: isTyping,
    });

    window.clearTimeout(typingTimerRef.current);

    if (isTyping) {
      typingTimerRef.current = window.setTimeout(() => {
        sendEvent("group-typing", {
          group_id: groupID,
          is_typing: false,
        });
      }, 900);
    }
  }

  function handleComposerEmojiSelect(emoji) {
    const input = composerInputRef.current;
    const selectionStart = input?.selectionStart ?? content.length;
    const selectionEnd = input?.selectionEnd ?? content.length;
    const nextContent =
      `${content.slice(0, selectionStart)}${emoji}${content.slice(
        selectionEnd,
      )}`.slice(0, 10000);
    const nextCaret = Math.min(
      selectionStart + emoji.length,
      nextContent.length,
    );

    updateDraft(nextContent);

    setIsComposerEmojiPickerOpen(false);

    window.requestAnimationFrame(() => {
      input?.focus();
      input?.setSelectionRange(nextCaret, nextCaret);
    });
  }

  function closeReactionPickers() {
    setReactionTargetID("");
    setQuickReactionTargetID("");
  }

  function toggleQuickReactionPicker(messageID) {
    if (reactionTargetID === messageID) {
      closeReactionPickers();
      return;
    }

    setQuickReactionTargetID((current) =>
      current === messageID ? "" : messageID,
    );
  }

  function toggleReactionPicker(messageID) {
    setReactionTargetID((current) => (current === messageID ? "" : messageID));

    setQuickReactionTargetID("");
  }

  async function submitReaction(messageID, emoji) {
    closeReactionPickers();

    await reactToMessage(messageID, emoji);
  }

  async function handleMessageScroll() {
    const container = messageListRef.current;

    if (!container || container.scrollTop > 48 || !hasMore || loadingMore) {
      return;
    }

    capturePrependAnchor();
    const loaded = await loadMore();

    if (loaded) {
      queuePrependRestore();
      return;
    }

    discardPrependAnchor();
  }

  return (
    <section className="group-chat">
      <header className="group-chat-header">
        <div>
          <h2 title={groupTitle}>{groupTitle}</h2>
        </div>
      </header>

      <div
        ref={messageListRef}
        className="chat-messages group-chat-messages"
        onScroll={handleMessageScroll}
      >
        {loading ? (
          <p className="chat-empty">Loading messages…</p>
        ) : (
          <>
            {loadingMore && (
              <p className="chat-loading-older">Loading older messages…</p>
            )}

            {messages.length === 0 && (
              <p className="chat-empty">
                No messages yet. Start the conversation.
              </p>
            )}

            {messages.map((message, index) => {
              const isMine = message.sender_id === currentUserID;

              const showDay =
                index === 0 ||
                messageDay(messages[index - 1].created_at) !==
                  messageDay(message.created_at);

              return (
                <div
                  key={message.public_id}
                  data-chat-message-id={message.public_id}
                >
                  {showDay && (
                    <p className="chat-day-divider">
                      {messageDay(message.created_at)}
                    </p>
                  )}

                  {!isMine && (
                    <p className="group-chat-sender">{senderName(message)}</p>
                  )}

                  <article
                    className={`chat-message${
                      isMine ? " chat-message--mine" : ""
                    }`}
                  >
                    <div>
                      <p>{message.content}</p>

                      <footer>
                        <time>{messageTime(message.created_at)}</time>

                        {isMine && (
                          <span>
                            {message.read_count > 0
                              ? `Read by ${message.read_count}`
                              : "Sent"}
                          </span>
                        )}

                        <MessageReactions
                          message={message}
                          isPickerOpen={reactionTargetID === message.public_id}
                          isQuickPickerOpen={
                            quickReactionTargetID === message.public_id
                          }
                          onReact={(messageID, emoji) =>
                            void submitReaction(messageID, emoji)
                          }
                          onTogglePicker={toggleReactionPicker}
                          onToggleQuickPicker={toggleQuickReactionPicker}
                        />
                      </footer>
                    </div>
                  </article>
                </div>
              );
            })}

            {typers.length > 0 && (
              <div className="group-chat-typing-row">
                <div className="chat-typing" aria-label={typingText(typers)}>
                  <span />
                  <span />
                  <span />
                </div>

                <small>{typingText(typers)}</small>
              </div>
            )}
          </>
        )}
      </div>

      <form
        className="chat-composer group-chat-composer loop-form"
        onSubmit={handleSubmit}
      >
        <input
          ref={composerInputRef}
          className="loop-form__control"
          value={content}
          onChange={(event) => updateDraft(event.target.value)}
          maxLength="10000"
          placeholder="Type a message"
          aria-label="Message"
        />

        <div ref={composerEmojiRef} className="chat-composer__emoji-control">
          <button
            className="chat-composer__emoji-button loop-icon-button"
            type="button"
            onClick={() => setIsComposerEmojiPickerOpen((current) => !current)}
            aria-label="Choose an emoji"
            aria-expanded={isComposerEmojiPickerOpen}
          >
            <Smiley size={22} weight="regular" />
          </button>

          {isComposerEmojiPickerOpen && (
            <div className="chat-composer__emoji-picker">
              <ChatEmojiPicker
                width={340}
                height={380}
                onEmojiSelect={handleComposerEmojiSelect}
              />
            </div>
          )}
        </div>

        <button
          className="chat-composer__send loop-button loop-button--primary"
          type="submit"
          disabled={sending || !content.trim()}
          aria-label="Send message"
        >
          <PaperPlaneTilt size={21} weight="fill" />
        </button>
      </form>
    </section>
  );
}
