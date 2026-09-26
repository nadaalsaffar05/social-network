import { useCallback, useEffect, useState } from "react";
import {
  getUserGroupInvitations,
  respondToGroupInvitation,
} from "../../../api/groups.js";
import { INITIAL_CURSOR, PAGINATION_STATUS } from "./pagination.js";

const INVITATIONS_LIMIT = 15;

export function useUserGroupInvitations() {
  const [invitations, setInvitations] = useState([]);
  const [total, setTotal] = useState(0);
  const [nextCursor, setNextCursor] = useState(INITIAL_CURSOR);
  const [status, setStatus] = useState(PAGINATION_STATUS.LOADING);
  const [error, setError] = useState(null);
  const [respondingInviteID, setRespondingInviteID] = useState(null);

  const refresh = useCallback(async () => {
    setStatus(PAGINATION_STATUS.LOADING);
    setError(null);
    try {
      const data = await getUserGroupInvitations({
        limit: INVITATIONS_LIMIT,
      });
      setInvitations(data?.invitations || []);
      setTotal(data?.total || 0);
      setNextCursor(data?.next_cursor || INITIAL_CURSOR);
      setStatus(PAGINATION_STATUS.READY);
    } catch (requestError) {
      setError(requestError.message);
      setStatus(PAGINATION_STATUS.ERROR);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (!nextCursor || status === PAGINATION_STATUS.LOADING_MORE) {
      return;
    }
    setStatus(PAGINATION_STATUS.LOADING_MORE);
    setError(null);
    try {
      const data = await getUserGroupInvitations({
        limit: INVITATIONS_LIMIT,
        cursor: nextCursor,
      });
      setInvitations((currentInvitations) => [
        ...currentInvitations,
        ...(data?.invitations || []),
      ]);
      setTotal(data?.total || 0);
      setNextCursor(data?.next_cursor || INITIAL_CURSOR);
      setStatus(PAGINATION_STATUS.READY);
    } catch (requestError) {
      setError(requestError.message);
      setStatus(PAGINATION_STATUS.READY);
    }
  }, [nextCursor, status]);

  const respond = useCallback(async (inviteID, action) => {
    setRespondingInviteID(inviteID);
    setError(null);
    try {
      await respondToGroupInvitation(inviteID, action);
      setInvitations((currentInvitations) =>
        currentInvitations.filter(
          (invitation) => invitation.invite_id !== inviteID,
        ),
      );
      setTotal((currentTotal) => Math.max(0, currentTotal - 1));
      return true;
    } catch (requestError) {
      setError(requestError.message);
      return false;
    } finally {
      setRespondingInviteID(null);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refresh();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [refresh]);

  return {
    invitations,
    total,
    error,
    status,
    hasMore: Boolean(nextCursor),
    respondingInviteID,
    refresh,
    loadMore,
    respond,
  };
}
