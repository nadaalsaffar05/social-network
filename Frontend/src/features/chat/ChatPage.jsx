import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, MagnifyingGlass, PaperPlaneTilt, Trash } from "@phosphor-icons/react";

import {
  acceptMessageRequest,
  declineMessageRequest,
  deletePrivateMessage,
  getConversations,
  getMessageRequests,
  getPrivateMessages,
  reactToPrivateMessage,
  sendPrivateMessage,
} from "../../api/chat.js";
import { useChatRealtime } from "./realtime/useChatRealtime.js";
import { useToast } from "../../shared/components/toast/useToast.js";
import Avatar from "../../shared/components/avatar/Avatar.jsx";
import GradientWaves from "../feed/components/GradientWaves.jsx";
import { GRADIENT_WAVE_PROPS } from "../feed/constants.js";
import MessageReactions from "./components/MessageReactions.jsx";
import "../../shared/styles/components/post-composer.css";
import "./ChatPage.css";

function displayName(user) {
  if (!user) return "Unknown user";
  return user.nickname || [user.first_name, user.last_name].filter(Boolean).join(" ") || "Unknown user";
}

function shortTime(value) {
  if (!value) return "";
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function messageTime(value) {
  return new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function messageDay(value) {
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function addMessages(current, incoming, { prepend = false } = {}) {
  const knownIDs = new Set(current.map((message) => message.public_id));
  const additions = incoming.filter((message) => !knownIDs.has(message.public_id));
  return prepend ? [...additions, ...current] : [...current, ...additions];
}

export default function ChatPage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { error: showError, success: showSuccess } = useToast();
  const { events, onlineUserIDs, sendEvent, typingUserIDs } = useChatRealtime();
  const typingTimerRef = useRef(null);
  const [conversations, setConversations] = useState([]);
  const [requests, setRequests] = useState([]);
  const [messages, setMessages] = useState([]);
  const [nextCursor, setNextCursor] = useState("");
  const [lastSeenAt, setLastSeenAt] = useState(null);
  const [content, setContent] = useState("");
  const [reactionTargetID, setReactionTargetID] = useState("");
  const [quickReactionTargetID, setQuickReactionTargetID] = useState("");
  const [error, setError] = useState("");
  const [isLoadingThread, setIsLoadingThread] = useState(false);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [inboxQuery, setInboxQuery] = useState("");

  const loadInbox = useCallback(async () => {
    try {
      const [conversationResponse, requestResponse] = await Promise.all([getConversations(), getMessageRequests()]);
      setConversations(conversationResponse.conversations ?? []);
      setRequests(requestResponse.requests ?? []);
    } catch (requestError) {
      setError(requestError.message || "Could not load messages");
    }
  }, []);

  const loadThread = useCallback(async ({ cursor = "", appendOlder = false } = {}) => {
    if (!userId) return;

    try {
      if (appendOlder) setIsLoadingOlder(true);
      else setIsLoadingThread(true);

      const response = await getPrivateMessages(userId, { cursor });
      const chronologicalMessages = (response.messages ?? []).slice().reverse();
      setMessages((current) => (appendOlder ? addMessages(current, chronologicalMessages, { prepend: true }) : chronologicalMessages));
      setNextCursor(response.next_cursor ?? "");
      setLastSeenAt(response.last_seen_at ?? null);
      setError("");

      chronologicalMessages
        .filter((message) => message.is_active !== false && message.sender_id === userId && !message.read_at)
        .forEach((message) => {
          sendEvent("message:delivered", { public_id: message.public_id });
          sendEvent("message:read", { public_id: message.public_id });
        });
    } catch (requestError) {
      setError(requestError.message || "Could not load messages");
    } finally {
      if (appendOlder) setIsLoadingOlder(false);
      else setIsLoadingThread(false);
    }
  }, [sendEvent, userId]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadInbox(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadInbox]);

  useEffect(() => {
    if (!userId) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      void loadThread();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadThread, userId]);

  useEffect(() => () => {
    window.clearTimeout(typingTimerRef.current);
    if (userId) sendEvent("typing", { recipient_id: userId, is_typing: false });
  }, [sendEvent, userId]);

  useEffect(() => {
    const event = events.at(-1);
    if (!event) return;

    const timer = window.setTimeout(() => {
      if (["message:new", "message-request:new", "message-request:accepted", "message-request:declined"].includes(event.type)) {
        void loadInbox();
      }

      if (event.type === "message:new" && event.data.sender_id === userId) {
        setMessages((current) => addMessages(current, [event.data]));
        sendEvent("message:delivered", { public_id: event.data.public_id });
        sendEvent("message:read", { public_id: event.data.public_id });
      }

      if (event.type === "message:deleted") {
        setMessages((current) => current.map((message) => message.public_id === event.data.public_id
          ? { ...message, is_active: false }
          : message));
      }
      if (event.type === "message:reaction") {
        setMessages((current) => current.map((message) => message.public_id === event.data.public_id ? { ...message, reactions: event.data.reactions } : message));
      }

      if (event.type === "message:delivered" || event.type === "message:read") {
        const field = event.type === "message:read" ? "read_at" : "delivered_at";
        const timestamp = new Date().toISOString();
        setMessages((current) => current.map((message) => message.public_id === event.data.public_id
          ? { ...message, [field]: timestamp, ...(field === "read_at" && !message.delivered_at ? { delivered_at: timestamp } : {}) }
          : message));
      }

    }, 0);

    return () => window.clearTimeout(timer);
  }, [events, loadInbox, sendEvent, userId]);

  async function handleSubmit(event) {
    event.preventDefault();
    const text = content.trim();
    if (!text || !userId || isSending) return;

    try {
      setIsSending(true);
      const message = await sendPrivateMessage(userId, text);
      setMessages((current) => addMessages(current, [message]));
      setContent("");
      window.clearTimeout(typingTimerRef.current);
      sendEvent("typing", { recipient_id: userId, is_typing: false });
      await loadInbox();
    } catch (requestError) {
      showError("Could not send message", requestError.message || "Please try again");
    } finally {
      setIsSending(false);
    }
  }

  function handleTyping(event) {
    const nextContent = event.target.value;
    setContent(nextContent);
    if (!userId) return;

    const isTypingNow = nextContent.trim() !== "";
    sendEvent("typing", { recipient_id: userId, is_typing: isTypingNow });
    window.clearTimeout(typingTimerRef.current);
    if (isTypingNow) {
      typingTimerRef.current = window.setTimeout(() => {
        sendEvent("typing", { recipient_id: userId, is_typing: false });
      }, 900);
    }
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

    setQuickReactionTargetID((current) => current === messageID ? "" : messageID);
  }

  function toggleReactionPicker(messageID) {
    setReactionTargetID((current) => current === messageID ? "" : messageID);
    setQuickReactionTargetID("");
  }

  async function submitReaction(targetID, emoji) {
    closeReactionPickers();

    try {
      const response = await reactToPrivateMessage(userId, targetID, emoji);
      setMessages((current) => current.map((message) => message.public_id === targetID ? { ...message, reactions: response.reactions } : message));
    } catch (requestError) {
      showError("Could not react to message", requestError.message || "Please try again");
    }
  }

  async function handleDelete(publicID) {
    if (!userId) return;
    try {
      await deletePrivateMessage(userId, publicID);
      setMessages((current) => current.map((message) => message.public_id === publicID
        ? { ...message, is_active: false }
        : message));
      await loadInbox();
      showSuccess("Message deleted");
    } catch (requestError) {
      showError("Could not delete message", requestError.message || "Please try again");
    }
  }

  function handleMessageScroll(event) {
    if (event.currentTarget.scrollTop > 48 || !nextCursor || isLoadingOlder) return;
    void loadThread({ cursor: nextCursor, appendOlder: true });
  }

  async function respondToRequest(request, action) {
    try {
      if (action === "accept") await acceptMessageRequest(request.requester_id);
      else await declineMessageRequest(request.requester_id);
      setRequests((current) => current.filter((item) => item.conversation_id !== request.conversation_id));
      if (action === "accept") navigate(`/messages/${request.requester_id}`);
      await loadInbox();
      showSuccess(action === "accept" ? "Message request accepted" : "Message request declined");
    } catch (requestError) {
      showError("Could not update message request", requestError.message || "Please try again");
    }
  }

  const chats = conversations.filter((conversation) => !conversation.is_incoming_request);
  const filteredChats = chats.filter((conversation) => displayName(conversation.user).toLowerCase().includes(inboxQuery.trim().toLowerCase()));
  const activeUser = chats.find((conversation) => conversation.user.id === userId)?.user
    || requests.find((request) => request.requester_id === userId)?.requester;
  const isRemoteTyping = typingUserIDs.includes(userId);

  return (
    <main className="chat-page">
      <div className="chat-page__backdrop" aria-hidden="true">
        <GradientWaves {...GRADIENT_WAVE_PROPS} />
        <span className="chat-page__backdrop-card chat-page__backdrop-card--one" />
        <span className="chat-page__backdrop-card chat-page__backdrop-card--two" />
        <span className="chat-page__backdrop-card chat-page__backdrop-card--three" />
      </div>
      <div className="chat-page__overlay post-composer-overlay">
        <section
          className={`chat-shell post-composer-surface${userId ? " chat-shell--thread-open" : ""}`}
        >
          <aside className="chat-inbox" aria-label="Message inbox">
            <header className="chat-inbox__header">
              <button
                className="chat-inbox__back"
                type="button"
                onClick={() => window.history.length > 1 ? navigate(-1) : navigate("/home")}
                aria-label="Go back"
              >
                <ArrowLeft size={22} />
              </button>
              <h1>Chats</h1>
            </header>

            <label className="chat-inbox__search">
              <MagnifyingGlass size={18} />
              <input
                value={inboxQuery}
                onChange={(event) => setInboxQuery(event.target.value)}
                placeholder="Search chats"
              />
            </label>

            <div className="chat-inbox__scroll">
              {filteredChats.length === 0 ? (
                <p className="chat-empty">{inboxQuery ? "No matching chats" : "No chats yet"}</p>
              ) : filteredChats.map((conversation) => (
                <button
                  key={conversation.conversation_id}
                  type="button"
                  className={`chat-preview${conversation.user.id === userId ? " chat-preview--active" : ""}`}
                  onClick={() => navigate(`/messages/${conversation.user.id}`)}
                >
                  <Avatar
                    avatarPath={conversation.user.avatar_path}
                    seed={conversation.user.id}
                    className="chat-avatar"
                  />
                  <span className="chat-preview__copy">
                    <strong>{displayName(conversation.user)}</strong>
                    <small className={typingUserIDs.includes(conversation.user.id) ? "chat-preview__typing" : ""}>
                      {typingUserIDs.includes(conversation.user.id) ? "Typing…" : conversation.last_message || "Start a conversation"}
                    </small>
                  </span>
                  <time>{shortTime(conversation.last_message_at)}</time>
                </button>
              ))}

              <section className="chat-requests" aria-label="Message requests">
                <h2>Message requests {requests.length > 0 && <span>{requests.length}</span>}</h2>
                {requests.length === 0 ? (
                  <p className="chat-empty">No message requests</p>
                ) : requests.map((request) => (
                  <article key={request.conversation_id} className="chat-request">
                    <Avatar
                      avatarPath={request.requester.avatar_path}
                      seed={request.requester.id}
                      className="chat-avatar"
                    />
                    <div>
                      <strong>{displayName(request.requester)}</strong>
                      <p>{request.message?.content}</p>
                      <button type="button" onClick={() => respondToRequest(request, "accept")}>Accept</button>
                      <button type="button" onClick={() => respondToRequest(request, "decline")}>Decline</button>
                    </div>
                  </article>
                ))}
              </section>
            </div>
          </aside>

          <section className="chat-thread" aria-label="Conversation">
            {!userId ? (
              <div className="chat-thread__empty">
                <p>Select a chat to start messaging</p>
              </div>
            ) : (
              <>
                <header className="chat-thread__header">
                  <button className="chat-back" type="button" onClick={() => navigate("/messages")} aria-label="Back to chats">
                    <ArrowLeft size={22} />
                  </button>
                  <Avatar
                    avatarPath={activeUser?.avatar_path}
                    seed={activeUser?.id}
                    className="chat-avatar"
                  />
                  <div>
                    <h2>{displayName(activeUser)}</h2>
                    <p>{onlineUserIDs.includes(userId) ? "Online" : lastSeenAt ? `Last seen ${shortTime(lastSeenAt)}` : "Offline"}</p>
                  </div>
                </header>
                {error && <p className="chat-error" role="alert">{error}</p>}
                <div className="chat-messages" onScroll={handleMessageScroll}>
                  {isLoadingThread ? <p className="chat-empty">Loading messages…</p> : (
                    <>
                      {isLoadingOlder && <p className="chat-loading-older">Loading older messages…</p>}
                      {messages.map((message, index) => {
                        const isMine = message.sender_id !== userId;
                        const isDeleted = message.is_active === false;
                        const showDay = index === 0 || messageDay(messages[index - 1].created_at) !== messageDay(message.created_at);

                        return (
                          <div key={message.public_id}>
                            {showDay && <p className="chat-day-divider">{messageDay(message.created_at)}</p>}
                            <article className={`chat-message${isMine ? " chat-message--mine" : ""}${isDeleted ? " chat-message--deleted" : ""}`}>
                              <div>
                              <p>{isDeleted ? "This message was deleted" : message.content}</p>
                              <footer>
                                <time>{messageTime(message.created_at)}</time>
                                {!isDeleted && isMine && <span>{message.read_at ? "Read" : message.delivered_at ? "Delivered" : "Sent"}</span>}
                                {!isDeleted && isMine && (
                                  <button type="button" onClick={() => handleDelete(message.public_id)} aria-label="Delete message">
                                    <Trash size={14} />
                                  </button>
                                )}
                                {!isDeleted && (
                                  <MessageReactions
                                    message={message}
                                    isPickerOpen={reactionTargetID === message.public_id}
                                    isQuickPickerOpen={quickReactionTargetID === message.public_id}
                                    onReact={(messageID, emoji) => void submitReaction(messageID, emoji)}
                                    onTogglePicker={toggleReactionPicker}
                                    onToggleQuickPicker={toggleQuickReactionPicker}
                                  />
                                )}
                              </footer>
                              </div>
                            </article>
                          </div>
                        );
                      })}
                      {isRemoteTyping && (
                        <div className="chat-typing" aria-label={`${displayName(activeUser)} is typing`}>
                          <span />
                          <span />
                          <span />
                        </div>
                      )}
                    </>
                  )}
                </div>
                <form className="chat-composer" onSubmit={handleSubmit}>
                  <input value={content} onChange={handleTyping} maxLength="10000" placeholder="Type a message" aria-label="Message" />
                  <button type="submit" disabled={isSending || !content.trim()} aria-label="Send message">
                    <PaperPlaneTilt size={21} weight="fill" />
                  </button>
                </form>
              </>
            )}
          </section>
        </section>
      </div>
    </main>
  );
}
