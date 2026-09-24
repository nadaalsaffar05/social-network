import { useEffect, useRef, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";

import {
  getGroupById,
  joinGroup,
  cancelJoinRequest,
} from "../../api/groups.js";
import { getProfile } from "../../api/profile.js";
import GroupCard from "./components/GroupCard.jsx";
import GroupDetails from "./components/GroupDetails.jsx";
import CreateGroupModal from "./components/CreateGroupModal.jsx";
import PageHeader from "../../shared/components/back-button/PageHeader.jsx";
import { useToast } from "../../shared/components/toast/useToast.js";
import { usePageNavigate } from "../../shared/components/back-button/usePageBack.js";
import GradientWaves from "../feed/components/GradientWaves.jsx";
import { GRADIENT_WAVE_PROPS } from "../feed/constants.js";
import { useGroups } from "./hooks/useGroups.js";
import { Plus } from "@phosphor-icons/react";
import "./GroupsPage.css";

export default function GroupsPage() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigateTo = usePageNavigate();
  const { error: showError, success: showSuccess } = useToast();
  const filter = searchParams.get("filter") === "mine" ? "mine" : "discover";
  const selectedGroupId =
    filter === "discover" ? searchParams.get("selected") : null;
  const { groups, setGroups, error, status, hasMore, refresh, loadMore } =
    useGroups(filter);
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [groupActionLoading, setGroupActionLoading] = useState(false);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const loadMoreRef = useRef(null);
  const loading = status === "loading";
  const loadingMore = status === "loading-more";

  // Get current user
  useEffect(() => {
    let isMounted = true;

    getProfile({ includePosts: false })
      .then((profile) => {
        if (isMounted) {
          setCurrentUser(profile);
        }
      })
      .catch((requestError) => {
        if (isMounted) {
          showError(
            "Could not load profile",
            requestError.message || "Please try again.",
          );
        }
      });

    return () => {
      isMounted = false;
    };
  }, [showError]);

  // make discover always have a selected group
  useEffect(() => {
    if (filter !== "discover") {
      setSelectedGroup(null);
      return;
    }

    if (groups.length === 0) {
      setSelectedGroup(null);
      return;
    }

    const selectedStillExists = groups.some(
      (group) => group.id === selectedGroupId,
    );

    if (!selectedGroupId || !selectedStillExists) {
      const firstGroupID = groups[0].id;

      setSearchParams(
        (currentParams) => {
          const nextParams = new URLSearchParams(currentParams);

          nextParams.delete("filter");
          nextParams.set("selected", firstGroupID);

          return nextParams;
        },
        {
          state: location.state,
          replace: true,
        },
      );
    }
  }, [filter, groups, selectedGroupId, location.state, setSearchParams]);

  // Pagination
  useEffect(() => {
    const target = loadMoreRef.current;

    if (!target || !hasMore) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];

        if (entry.isIntersecting && status === "ready") {
          void loadMore();
        }
      },
      {
        rootMargin: "200px",
      },
    );

    observer.observe(target);

    return () => {
      observer.disconnect();
    };
  }, [hasMore, status, loadMore]);

  // Load selected Discover group details
  useEffect(() => {
    if (filter !== "discover" || !selectedGroupId) {
      setSelectedGroup(null);
      return;
    }

    let isMounted = true;

    async function loadGroupDetails() {
      try {
        setDetailsLoading(true);

        const data = await getGroupById(selectedGroupId);

        if (isMounted) {
          setSelectedGroup(data);
        }
      } catch (requestError) {
        if (isMounted) {
          setSelectedGroup(null);

          showError(
            "Could not load group",
            requestError.message || "Please try again.",
          );
        }
      } finally {
        if (isMounted) {
          setDetailsLoading(false);
        }
      }
    }

    void loadGroupDetails();

    return () => {
      isMounted = false;
    };
  }, [filter, selectedGroupId, showError]);

  // Pagination errors
  useEffect(() => {
    if (!error) {
      return;
    }

    showError("Could not load groups", error || "Please try again.");
  }, [error, showError]);

  function handleFilterChange(nextFilter) {
    setSelectedGroup(null);

    setSearchParams(
      (currentParams) => {
        const nextParams = new URLSearchParams(currentParams);

        nextParams.delete("selected");

        if (nextFilter === "mine") {
          nextParams.set("filter", "mine");
        } else {
          nextParams.delete("filter");
        }

        return nextParams;
      },
      {
        state: location.state,
        replace: true,
      },
    );
  }

  function handleDiscoverSelection(groupID) {
    setSearchParams(
      (currentParams) => {
        const nextParams = new URLSearchParams(currentParams);

        nextParams.delete("filter");
        nextParams.set("selected", groupID);

        return nextParams;
      },
      {
        state: location.state,
        replace: true,
      },
    );
  }

  async function handleJoinGroup() {
    if (!selectedGroup || groupActionLoading) {
      return;
    }

    try {
      setGroupActionLoading(true);

      await joinGroup(selectedGroup.id);

      setSelectedGroup((current) => ({
        ...current,
        has_pending_request: true,
      }));

      setGroups((currentGroups) =>
        currentGroups.map((group) =>
          group.id === selectedGroup.id
            ? {
                ...group,
                has_pending_request: true,
              }
            : group,
        ),
      );

      showSuccess("Join request sent");
    } catch (requestError) {
      showError(
        "Could not join group",
        requestError.message || "Please try again.",
      );
    } finally {
      setGroupActionLoading(false);
    }
  }

  async function handleCancelJoinRequest() {
    if (!selectedGroup || groupActionLoading) {
      return;
    }

    try {
      setGroupActionLoading(true);

      await cancelJoinRequest(selectedGroup.id);

      setSelectedGroup((current) => ({
        ...current,
        has_pending_request: false,
      }));

      setGroups((currentGroups) =>
        currentGroups.map((group) =>
          group.id === selectedGroup.id
            ? {
                ...group,
                has_pending_request: false,
              }
            : group,
        ),
      );

      showSuccess("Join request cancelled");
    } catch (requestError) {
      showError(
        "Could not cancel join request",
        requestError.message || "Please try again.",
      );
    } finally {
      setGroupActionLoading(false);
    }
  }

  return (
    <main className="groups-page">
      <div className="groups-waves">
        <GradientWaves {...GRADIENT_WAVE_PROPS} />
      </div>

      <div className="groups-page-shell">
        <div className="groups-page-header">
          <PageHeader title="Groups" />
        </div>

        <div className="groups-layout">
          <section className="groups-browser">
            <div className="groups-tabs">
              <div className="groups-tabs-main">
                <button
                  type="button"
                  className={`groups-tab ${
                    filter === "discover" ? "active" : ""
                  }`}
                  onClick={() => handleFilterChange("discover")}
                >
                  View Groups
                </button>

                <button
                  type="button"
                  className={`groups-tab ${filter === "mine" ? "active" : ""}`}
                  onClick={() => handleFilterChange("mine")}
                >
                  My Groups
                </button>
              </div>

              <button
                type="button"
                className="groups-tab create-group-tab"
                onClick={() => setShowCreateGroup(true)}
              >
                <Plus size={18} weight="bold" />
                Create Group
              </button>
            </div>

            <div className="groups-list-panel border-glow">
              {loading && <p>Loading groups...</p>}

              {!loading && groups.length === 0 && (
                <p className="groups-empty">
                  {filter === "discover"
                    ? "No groups to discover."
                    : "You haven't joined any groups yet."}
                </p>
              )}

              {!loading && groups.length > 0 && (
                <>
                  <div className="groups-list">
                    {groups.map((group) => (
                      <GroupCard
                        key={group.id}
                        group={group}
                        filter={filter}
                        currentUserID={currentUser?.id}
                        selected={
                          filter === "discover" && selectedGroupId === group.id
                        }
                        onSelect={() => {
                          if (filter === "mine") {
                            navigateTo(`/groups/${group.id}`);
                            return;
                          }

                          handleDiscoverSelection(group.id);
                        }}
                      />
                    ))}
                  </div>

                  {hasMore && (
                    <div
                      ref={loadMoreRef}
                      className="groups-scroll-trigger"
                      aria-hidden="true"
                    />
                  )}

                  {loadingMore && (
                    <p className="groups-loading-more">
                      Loading more groups...
                    </p>
                  )}
                </>
              )}
            </div>
          </section>

          <aside className="groups-side-column">
            {filter === "discover" && selectedGroup && (
              <GroupDetails
                group={selectedGroup}
                loading={detailsLoading}
                error=""
                actionLoading={groupActionLoading}
                onJoin={handleJoinGroup}
                onCancelRequest={handleCancelJoinRequest}
                mode="discover"
              />
            )}
          </aside>
        </div>
      </div>

      {showCreateGroup && (
        <CreateGroupModal
          onClose={() => setShowCreateGroup(false)}
          onCreated={async () => {
            if (filter === "mine") {
              await refresh();
            } else {
              handleFilterChange("mine");
            }
          }}
        />
      )}
    </main>
  );
}
