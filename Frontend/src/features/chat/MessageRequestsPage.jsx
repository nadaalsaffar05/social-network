import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { acceptMessageRequest, declineMessageRequest, getMessageRequests } from "../../api/chat.js";

export default function MessageRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    getMessageRequests()
      .then((response) => setRequests(response.requests ?? []))
      .catch((requestError) => setError(requestError.message || "Could not load message requests"));
  }, []);

  async function respond(request, action) {
    try {
      if (action === "accept") await acceptMessageRequest(request.requester_id);
      else await declineMessageRequest(request.requester_id);
      setRequests((current) => current.filter((item) => item.conversation_id !== request.conversation_id));
    } catch (requestError) {
      setError(requestError.message || "Could not update message request");
    }
  }

  return (
    <main>
      <h1>Message requests</h1>
      <Link to="/messages">Back to messages</Link>
      {error && <p role="alert">{error}</p>}
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
