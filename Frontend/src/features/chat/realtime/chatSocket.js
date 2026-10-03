import { BASE_API } from "../../../config/api";

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
    if (
      socket?.readyState === WebSocket.CONNECTING ||
      socket?.readyState === WebSocket.OPEN
    ) {
      return;
    }

    const connection = new WebSocket(websocketURL());
    socket = connection;
    onStatus?.("connecting");

    connection.onopen = () => {
      if (socket === connection) onStatus?.("connected");
    };
    connection.onmessage = ({ data }) => {
      if (socket !== connection) return;
      try {
        onEvent?.(JSON.parse(data));
      } catch {
        return;
      }
    };
    connection.onclose = () => {
      if (socket !== connection) return;
      socket = null;
      onStatus?.("disconnected");
      if (!closed) reconnectTimer = window.setTimeout(connect, 2000);
    };
    connection.onerror = () => {
      if (socket === connection) connection.close();
    };
  }

  function reconnect(force = false) {
    if (closed) return;
    window.clearTimeout(reconnectTimer);
    if (socket?.readyState === WebSocket.CONNECTING && !force) return;
    if (socket?.readyState === WebSocket.OPEN && !force) return;

    const previousConnection = socket;
    socket = null;
    previousConnection?.close();
    connect();
  }

  function send(type, data) {
    if (socket?.readyState !== WebSocket.OPEN) return false;
    socket.send(JSON.stringify({ type, data }));
    return true;
  }

  return {
    connect,
    reconnect,
    send,
    close() {
      closed = true;
      window.clearTimeout(reconnectTimer);
      const connection = socket;
      socket = null;
      connection?.close();
    },
  };
}
