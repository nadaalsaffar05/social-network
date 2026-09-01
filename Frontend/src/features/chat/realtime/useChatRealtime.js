import { useContext } from "react";

import { ChatRealtimeContext } from "./chatRealtimeContext.js";

export function useChatRealtime() {
  const context = useContext(ChatRealtimeContext);
  if (!context) throw new Error("useChatRealtime must be used inside ChatRealtimeProvider");
  return context;
}
