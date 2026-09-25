import { useEffect, useState } from "react";
import {
  useLocation,
  useParams,
  useSearchParams,
  useNavigate,
} from "react-router-dom";

import { getGroupById, leaveGroup } from "../../api/groups.js";
import { getProfile } from "../../api/profile.js";
import PageHeader from "../../shared/components/back-button/PageHeader.jsx";
import { useToast } from "../../shared/components/toast/useToast.js";
import GradientWaves from "../feed/components/GradientWaves.jsx";
import { GRADIENT_WAVE_PROPS } from "../feed/constants.js";
import GroupDetails from "./components/GroupDetails.jsx";
import GroupPosts from "./components/GroupPosts.jsx";
import GroupChat from "./components/GroupChat.jsx";
import GroupEvents from "./components/GroupEvents.jsx";
import GroupJoinRequests from "./components/GroupJoinRequests.jsx";
import GroupMembers from "./components/GroupMembers.jsx";
import GroupNavigation from "./components/GroupNavigation.jsx";
import { useGroupEvents } from "./hooks/useGroupEvents.js";
import "./GroupPage.css";

export default function GroupPage() {
  const { groupId } = useParams();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { error: showError, success: showSuccess } = useToast();
  const [group, setGroup] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [leaving, setLeaving] = useState(false);
  const activeSection = searchParams.get("tab") || "posts";
  const groupEvents = useGroupEvents(groupId);

  useEffect(() => {
    let isMounted = true;

    async function loadGroupPage() {
      try {
        setLoading(true);

        const [groupData, profileData] = await Promise.all([
          getGroupById(groupId),
          getProfile({ includePosts: false }),
        ]);

        if (!isMounted) {
          return;
        }

        setGroup(groupData);
        setCurrentUser(profileData);
      } catch (requestError) {
        if (!isMounted) {
          return;
        }

        showError(
          "Could not load group",
          requestError.message || "Please try again.",
        );
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadGroupPage();

    return () => {
      isMounted = false;
    };
  }, [groupId, showError]);

  function handleSectionChange(section) {
    setSearchParams(section === "posts" ? {} : { tab: section }, {
      state: location.state,
      replace: true,
    });
  }

  async function handleLeaveGroup() {
    if (!group || leaving) {
      return;
    }

    const confirmed = window.confirm(`Leave "${group.title}"?`);

    if (!confirmed) {
      return;
    }

    try {
      setLeaving(true);

      await leaveGroup(group.id);

      showSuccess("You left the group");

      navigate("/groups", { replace: true });
    } catch (requestError) {
      showError(
        "Could not leave group",
        requestError.message || "Please try again.",
      );
    } finally {
      setLeaving(false);
    }
  }

  if (loading) {
    return <p>Loading group...</p>;
  }

  if (!group || !currentUser) {
    return null;
  }

  const isCreator = String(group.creator_id) === String(currentUser.id);

  return (
    <main className="group-page">
      <div className="group-page-waves">
        <GradientWaves {...GRADIENT_WAVE_PROPS} />
      </div>

      <div className="group-page-shell">
        <div className="group-page-header">
          <PageHeader fallback="/groups" />
        </div>

        <div className="group-page-layout">
          <section className="group-page-main">
            <div className="group-content">
              <GroupNavigation
                activeSection={activeSection}
                onSectionChange={handleSectionChange}
                isCreator={isCreator}
              />

              <div className="group-content-card">
                <div className="group-section-content">
                  {activeSection === "posts" && (
                    <GroupPosts
                      groupID={group.id}
                      currentUserID={currentUser.id}
                    />
                  )}

                  {activeSection === "chat" && (
                    <GroupChat
                      groupID={group.id}
                      groupTitle={group.title}
                      currentUserID={currentUser.id}
                    />
                  )}

                  {activeSection === "events" && (
                    <GroupEvents
                      currentUserID={currentUser.id}
                      eventsState={groupEvents}
                    />
                  )}

                  {activeSection === "members" && (
                    <GroupMembers
                      groupID={group.id}
                      memberCount={group.member_count}
                    />
                  )}

                  {activeSection === "requests" && isCreator && (
                    <GroupJoinRequests groupID={group.id} />
                  )}
                </div>
              </div>
            </div>
          </section>

          <aside className="group-page-side">
            <GroupDetails
              group={group}
              loading={false}
              error=""
              mode="member"
              isCreator={isCreator}
              actionLoading={leaving}
              onLeave={handleLeaveGroup}
            />

          </aside>
        </div>
      </div>
    </main>
  );
}
