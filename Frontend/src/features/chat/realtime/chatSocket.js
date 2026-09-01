import { BASE_API } from "../../../config/api.js";

function websocketURL() {
  const url = new URL(BASE_API);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = `${url.pathname.replace(/\/$/, "")}/ws`;
  url.search = "";
  return url.toString();
}

export function createChatSocket({ onEvent, onStatus }) {
  let socket;
  let reconnectTimer;
  let closed = false;

  function connect() {
    if (closed) return;

    socket = new WebSocket(websocketURL());
    onStatus?.("connecting");

    socket.onopen = () => onStatus?.("connected");
    socket.onmessage = ({ data }) => {
      try {
        onEvent?.(JSON.parse(data));
      } catch {
        // Ignore malformed socket payloads.
      }
    };
    socket.onclose = () => {
      onStatus?.("disconnected");
      if (!closed) reconnectTimer = window.setTimeout(connect, 2000);
    };
    socket.onerror = () => socket.close();
  }

  function send(type, data) {
    if (socket?.readyState !== WebSocket.OPEN) return false;
    socket.send(JSON.stringify({ type, data }));
    return true;
  }

  return {
    connect,
    send,
    close() {
      closed = true;
      window.clearTimeout(reconnectTimer);
      socket?.close();
    },
  };
}
