import { useCallback, useEffect, useState } from "react";
import {
  cancelGroupInvitation,
  getGroupInvitations,
} from "../../../api/groups.js";

const INITIAL_CURSOR = "";
const INVITATIONS_LIMIT = 15;
const STATUS = {
  LOADING: "loading",
  LOADING_MORE: "loading-more",
  READY: "ready",
  ERROR: "error",
};

export function useGroupInvitations(groupID) {
  const [invitations, setInvitations] = useState([]);
  const [cancellingInviteID, setCancellingInviteID] = useState(null);
  const [total, setTotal] = useState(0);
  const [nextCursor, setNextCursor] = useState(INITIAL_CURSOR);
  const [status, setStatus] = useState(STATUS.LOADING);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (!groupID) {
      return;
    }
    setStatus(STATUS.LOADING);
    setError(null);
    try {
      const data = await getGroupInvitations(groupID, {
        limit: INVITATIONS_LIMIT,
      });

      setInvitations(data?.invitations || []);
      setTotal(data?.total || 0);
      setNextCursor(data?.next_cursor || INITIAL_CURSOR);
      setStatus(STATUS.READY);
    } catch (requestError) {
      setError(requestError.message);
      setStatus(STATUS.ERROR);
    }
  }, [groupID]);

  const loadMore = useCallback(async () => {
    if (!groupID || !nextCursor || status === STATUS.LOADING_MORE) {
      return;
    }
    setStatus(STATUS.LOADING_MORE);
    setError(null);
    try {
      const data = await getGroupInvitations(groupID, {
        limit: INVITATIONS_LIMIT,
        cursor: nextCursor,
      });
      setInvitations((currentInvitations) => [
        ...currentInvitations,
        ...(data?.invitations || []),
      ]);
      setTotal(data?.total || 0);
      setNextCursor(data?.next_cursor || INITIAL_CURSOR);
      setStatus(STATUS.READY);
    } catch (requestError) {
      setError(requestError.message);
      setStatus(STATUS.READY);
    }
  }, [groupID, nextCursor, status]);

  const cancel = useCallback(
    async (inviteID) => {
      setCancellingInviteID(inviteID);
      setError(null);

      try {
        await cancelGroupInvitation(groupID, inviteID);

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
        setCancellingInviteID(null);
      }
    },
    [groupID],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    invitations,
    setInvitations,
    total,
    error,
    status,
    hasMore: Boolean(nextCursor),
    cancellingInviteID,
    refresh,
    loadMore,
    cancel,
  };
}
