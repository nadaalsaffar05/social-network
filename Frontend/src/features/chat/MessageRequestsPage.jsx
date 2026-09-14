import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { acceptMessageRequest, declineMessageRequest, getMessageRequests } from "../../api/chat.js";
import { useToast } from "../../shared/components/toast/useToast.js";

export default function MessageRequestsPage() {
  const [requests, setRequests] = useState([]);
  const { error: showError, success: showSuccess } = useToast();

  useEffect(() => {
    getMessageRequests()
      .then((response) => setRequests(response.requests ?? []))
      .catch((requestError) => showError("Failed to load message requests", requestError.message || "Please try again"));
  }, [showError]);

  async function respond(request, action) {
    try {
      if (action === "accept") await acceptMessageRequest(request.requester_id);
      else await declineMessageRequest(request.requester_id);
      setRequests((current) => current.filter((item) => item.conversation_id !== request.conversation_id));
      showSuccess(action === "accept" ? "Message request accepted" : "Message request declined");
    } catch (requestError) {
      showError("Failed to update message request", requestError.message || "Please try again");
    }
  }

  return (
    <main>
      <h1>Message requests</h1>
      <Link to="/messages">Back to messages</Link>
      {requests.map((request) => (
        <article key={request.conversation_id}>
          <p>{request.requester?.nickname || request.requester?.first_name || request.requester_id}</p>
          <p>{request.message?.content}</p>
          <button type="button" onClick={() => respond(request, "accept")}>Accept</button>
          <button type="button" onClick={() => respond(request, "decline")}>Decline</button>
          <Link to={`/messages/${request.requester_id}`}>Open chat</Link>
        </article>
      ))}
    </main>
  );
}
