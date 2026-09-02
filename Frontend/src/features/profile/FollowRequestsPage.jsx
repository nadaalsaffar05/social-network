import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { getFollowRequests, respondToFollowRequest } from "../../api/profile.js";
import { useToast } from "../../shared/components/toast/useToast.js";

function nameOf(request) {
  return request.nickname || [request.first_name, request.last_name].filter(Boolean).join(" ") || "User";
}

export default function FollowRequestsPage() {
  const navigate = useNavigate();
  const { error: showError, success: showSuccess } = useToast();
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    getFollowRequests()
      .then((response) => setRequests(response.requests ?? []))
      .catch((requestError) => showError("Could not load follow requests", requestError.message || "Please try again."));
  }, [showError]);

  async function respond(requestID, action) {
    try {
      await respondToFollowRequest(requestID, action);
      setRequests((current) => current.filter((request) => request.id !== requestID));
      showSuccess(action === "accept" ? "Follow request accepted" : "Follow request declined");
    } catch (requestError) {
      showError("Could not update follow request", requestError.message || "Please try again.");
    }
  }

  return (
    <main>
      <button type="button" onClick={() => navigate(-1)}>Back</button>
      <h1>Follow requests</h1>
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
