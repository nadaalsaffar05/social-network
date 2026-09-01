import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { getFollowRequests, respondToFollowRequest } from "../../api/profile.js";

function nameOf(request) {
  return request.nickname || [request.first_name, request.last_name].filter(Boolean).join(" ") || "User";
}

export default function FollowRequestsPage() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    getFollowRequests()
      .then((response) => setRequests(response.requests ?? []))
      .catch((requestError) => setError(requestError.message || "Could not load follow requests"));
  }, []);

  async function respond(requestID, action) {
    try {
      await respondToFollowRequest(requestID, action);
      setRequests((current) => current.filter((request) => request.id !== requestID));
    } catch (requestError) {
      setError(requestError.message || "Could not update follow request");
    }
  }

  return (
    <main>
      <button type="button" onClick={() => navigate(-1)}>Back</button>
      <h1>Follow requests</h1>
      {error && <p role="alert">{error}</p>}
      {requests.length === 0 && <p>No pending follow requests.</p>}
      {requests.map((request) => (
        <article key={request.id}>
          <p>{nameOf(request)} wants to follow you.</p>
          <button type="button" onClick={() => respond(request.id, "accept")}>Accept</button>
          <button type="button" onClick={() => respond(request.id, "decline")}>Decline</button>
        </article>
      ))}
    </main>
  );
}
