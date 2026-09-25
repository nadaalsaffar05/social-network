import { useEffect, useState } from "react";
import {
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import {
  Camera,
  SignOut,
  NotePencil,
  EnvelopeSimple,
  Cake,
  ShieldCheck,
  Users,
  UserPlus,
} from "@phosphor-icons/react";
import {
  followUser,
  getFollowers,
  getFollowing,
  getProfile,
  getPublicProfile,
  isFollowing,
  unfollowUser,
} from "../../api/profile.js";
import { deletePost, togglePostReaction } from "../../api/feed.js";
import { logoutUser } from "../../api/auth";
import Avatar from "../../shared/components/avatar/Avatar.jsx";
import PageHeader from "../../shared/components/back-button/PageHeader.jsx";
import { usePageNavigate } from "../../shared/components/back-button/usePageBack.js";
import EditProfileModal from "./EditProfileModal";
import PostCard from "../feed/components/PostCard.jsx";
import GradientWaves from "../feed/components/GradientWaves.jsx";
import { GRADIENT_WAVE_PROPS } from "../feed/constants.js";
import { formatDateOnly } from "../../shared/utils/dateTime.js";
import { getUserFullName } from "../../shared/utils/user.js";
import { useToast } from "../../shared/components/toast/useToast.js";
import {
  ProfileSkeleton,
  UserItemSkeleton,
} from "../../shared/components/skeleton/PageSkeletons.jsx";
import { PROFILE_PRIVACY } from "../../shared/constants/enums.js";
import "./ProfilePage.css";

export default function ProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const navigateTo = usePageNavigate();
  const { error: showError, success: showSuccess } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = searchParams.get("tab") || "posts";

  const [profile, setProfile] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reactingPostID, setReactingPostID] = useState("");
  const [deletingPostID, setDeletingPostID] = useState("");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isFollowingProfile, setIsFollowingProfile] = useState(false);

  const [followersList, setFollowersList] = useState([]);
  const [followingList, setFollowingList] = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState("");
  const [unfollowingID, setUnfollowingID] = useState(null);
  const isOwnProfile =
    !id ||
    (currentUser?.id &&
      profile?.id &&
      String(currentUser.id) === String(profile.id));

  function handleTabChange(newTab) {
    setSearchParams(newTab === "posts" ? {} : { tab: newTab }, {
      state: location.state,
    });
  }

  useEffect(() => {
    let isMounted = true;

    async function loadProfile() {
      try {
        setLoading(true);
        const myProfile = await getProfile();
        const userProfile = id ? await getPublicProfile(id) : myProfile;
        const isSelf =
          !id ||
          (myProfile?.id &&
            userProfile?.id &&
            String(myProfile.id) === String(userProfile.id));
        const relationship = id && !isSelf ? await isFollowing(id) : null;
        if (isMounted) {
          setCurrentUser(myProfile);
          setProfile(userProfile);
          setIsFollowingProfile(relationship?.is_following ?? false);
        }
      } catch (requestError) {
        if (
          requestError.message === "unauthorized" ||
          requestError.message === "authentication required" ||
          requestError.message === "session expired or invalid"
        ) {
          navigate("/login", { replace: true });
          return;
        }
        if (isMounted) {
          showError(
            "Failed to load profile",
            requestError.message || "Please try again",
          );
          navigate("/home", { replace: true });
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadProfile();
    return () => {
      isMounted = false;
    };
  }, [navigate, id, showError]);

  useEffect(() => {
    let isMounted = true;

    async function loadTabData() {
      if (activeTab === "followers") {
        try {
          setListLoading(true);
          setListError("");
          const data = await getFollowers(id);
          if (isMounted) setFollowersList(data);
        } catch (err) {
          if (isMounted)
            setListError(err.message || "Failed to load followers");
        } finally {
          if (isMounted) setListLoading(false);
        }
      } else if (activeTab === "following") {
        try {
          setListLoading(true);
          setListError("");
          const data = await getFollowing(id);
          if (isMounted) setFollowingList(data);
        } catch (err) {
          if (isMounted)
            setListError(err.message || "Failed to load following list");
        } finally {
          if (isMounted) setListLoading(false);
        }
      }
    }

    loadTabData();
    return () => {
      isMounted = false;
    };
  }, [activeTab, id]);

  async function handleLogout() {
    try {
      await logoutUser();
      navigate("/login", { replace: true });
    } catch (requestError) {
      showError("Failed to log out", requestError.message);
    }
  }

  function handleProfileSave(updatedUser) {
    setProfile((prev) => (prev ? { ...prev, ...updatedUser } : updatedUser));
    if (showSuccess)
      showSuccess(
        "Profile updated",
        "Your profile details have been updated successfully",
      );
  }

  if (loading) {
    return <ProfileSkeleton />;
  }

  const fullName = getUserFullName(profile);
  const username = profile?.nickname
    ? `@${profile.nickname}`
    : profile?.email
      ? `@${profile.email.split("@")[0]}`
      : "";

  const followersCount = profile?.followers_count ?? 0;
  const followingCount = profile?.following_count ?? 0;
  const postsCount = profile?.posts_count ?? profile?.posts?.length ?? 0;
  const posts = profile?.posts ?? [];

  async function refreshProfile() {
    const nextProfile = id ? await getPublicProfile(id) : await getProfile();
    setProfile(nextProfile);
  }

  async function handleFollowProfile() {
    try {
      const response = await followUser(id);
      setIsFollowingProfile(response.status === "following");
      if (response.status === "following") {
        setProfile((current) =>
          current
            ? { ...current, followers_count: (current.followers_count ?? 0) + 1 }
            : current,
        );
      }
    } catch (requestError) {
      showError(
        "Failed to follow user",
        requestError.message || "Please try again",
      );
    }
  }

  async function handleUnfollowProfile() {
    try {
      await unfollowUser(id);
      setIsFollowingProfile(false);
      setProfile((current) =>
        current
          ? {
              ...current,
              followers_count: Math.max(0, (current.followers_count ?? 0) - 1),
            }
          : current,
      );
    } catch (requestError) {
      showError(
        "Failed to unfollow user",
        requestError.message || "Please try again",
      );
    }
  }

  async function handlePostReaction(postId) {
    setReactingPostID(postId);
    try {
      await togglePostReaction(postId, "LIKE");
      await refreshProfile();
    } catch (requestError) {
      showError(
        "Failed to update reaction",
        requestError.message || "Please try again",
      );
    } finally {
      setReactingPostID("");
    }
  }

  async function handleDeletePost(postId) {
    if (!window.confirm("Delete this post?")) return;
    setDeletingPostID(postId);
    try {
      await deletePost(postId);
      await refreshProfile();
    } catch (requestError) {
      showError(
        "Failed to delete post",
        requestError.message || "Please try again",
      );
    } finally {
      setDeletingPostID("");
    }
  }

  async function handleUnfollowItem(targetUser) {
    setUnfollowingID(targetUser.id);
    try {
      await unfollowUser(targetUser.id);
      if (showSuccess)
        showSuccess(
          "Unfollowed",
          `You unfollowed ${targetUser.first_name || "user"}`,
        );
      setFollowingList((prev) =>
        prev.filter((item) => item.id !== targetUser.id),
      );
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              following_count: Math.max(0, (prev.following_count || 1) - 1),
            }
          : prev,
      );
    } catch (requestError) {
      showError(
        "Failed to unfollow",
        requestError.message || "Please try again",
      );
    } finally {
      setUnfollowingID(null);
    }
  }

  function renderUserItem(u, isFollowingTab) {
    const uFullName = getUserFullName(u);
    const uHandle = u.nickname
      ? `@${u.nickname}`
      : u.email
        ? `@${u.email.split("@")[0]}`
        : "";

    return (
      <div key={u.id} className="profile-user-item">
        <div className="user-item-left">
          <div
            className="user-item-avatar-wrapper"
            onClick={() => navigateTo(`/profile/${u.id}`)}
          >
            <Avatar
              avatarPath={u.avatar_path}
              seed={u.id}
              className="user-item-avatar-img"
            />
          </div>
          <div className="user-item-info">
            <div className="user-item-name-row">
              <h4
                className="user-item-name"
                onClick={() => navigateTo(`/profile/${u.id}`)}
              >
                {uFullName}
              </h4>
              <span
                className={`profile-badge ${u.privacy === PROFILE_PRIVACY.PRIVATE ? "private" : ""}`}
              >
                {u.privacy === PROFILE_PRIVACY.PRIVATE ? "Private" : "Public"}
              </span>
            </div>
            {uHandle && <span className="user-item-handle">{uHandle}</span>}
          </div>
        </div>

        <div className="user-item-actions">
          {isFollowingTab && isOwnProfile && (
            <button
              type="button"
              className="user-item-btn unfollow-btn"
              disabled={unfollowingID === u.id}
              onClick={() => handleUnfollowItem(u)}
            >
              {unfollowingID === u.id ? "Unfollowing…" : "Unfollow"}
            </button>
          )}
          <button
            type="button"
            className="user-item-btn view-btn"
            onClick={() => navigateTo(`/profile/${u.id}`)}
          >
            View Profile
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="profile-layout-container">
      <div className="profile-waves">
        <GradientWaves {...GRADIENT_WAVE_PROPS} />
      </div>
      <div className="profile-page-content">
        <PageHeader title="Profile" />
        <div className="profile-layout-grid">
          {/* ==================== LEFT SIDEBAR ==================== */}
          <aside className="profile-sidebar">
            {/* Avatar Container with status cat badge */}
            <div className="profile-avatar-container">
              <div
                className={`profile-avatar-wrapper ${isOwnProfile ? "editable" : ""}`}
                onClick={
                  isOwnProfile ? () => setIsEditModalOpen(true) : undefined
                }
                title={isOwnProfile ? "Edit profile picture" : fullName}
              >
                <Avatar
                  id="profile-avatar"
                  avatarPath={profile?.avatar_path}
                  seed={profile?.id}
                  alt={fullName}
                  className="profile-avatar-img"
                />
                {isOwnProfile && (
                  <div className="profile-avatar-overlay">
                    <Camera size={26} weight="bold" />
                  </div>
                )}
              </div>
              {isOwnProfile && (
                <div
                  className="profile-status-badge"
                  title="Edit profile photo"
                  onClick={() => setIsEditModalOpen(true)}
                >
                  <NotePencil
                    size={18}
                    weight="bold"
                    className="profile-status-edit-icon"
                  />
                </div>
              )}
            </div>

            {/* Display Name & Handle */}
            <div className="profile-names-section">
              <h1 className="profile-fullname">{fullName}</h1>
              {username && <p className="profile-handle-line">{username}</p>}
            </div>

            {/* Bio */}
            {profile?.about_me && (
              <p className="profile-bio">{profile.about_me}</p>
            )}

            {/* Primary Action Button: "Edit profile" or "Follow" */}
            <div className="profile-primary-actions">
              {isOwnProfile ? (
                <button
                  type="button"
                  className="profile-edit-profile-btn"
                  onClick={() => setIsEditModalOpen(true)}
                >
                  Edit profile
                </button>
              ) : (
                <button
                  type="button"
                  className={
                    isFollowingProfile
                      ? "profile-edit-profile-btn secondary"
                      : "profile-edit-profile-btn primary"
                  }
                  onClick={
                    isFollowingProfile
                      ? handleUnfollowProfile
                      : handleFollowProfile
                  }
                >
                  {isFollowingProfile ? "Unfollow" : "Follow"}
                </button>
              )}
            </div>

            {/* Meta Details List with Phosphor Icons */}
            <div className="profile-meta-list">
              <div className="profile-meta-item">
                <Users
                  size={18}
                  weight="regular"
                  className="profile-meta-icon"
                />
                <span className="profile-followers-following">
                  <button
                    type="button"
                    className="profile-meta-stat-btn"
                    onClick={() => handleTabChange("followers")}
                  >
                    <strong>{followersCount}</strong> followers
                  </button>
                  {" · "}
                  <button
                    type="button"
                    className="profile-meta-stat-btn"
                    onClick={() => handleTabChange("following")}
                  >
                    <strong>{followingCount}</strong> following
                  </button>
                </span>
              </div>
              {isOwnProfile && profile?.email && (
                <div className="profile-meta-item">
                  <EnvelopeSimple
                    size={18}
                    weight="regular"
                    className="profile-meta-icon"
                  />
                  <span>{profile.email}</span>
                </div>
              )}

              {isOwnProfile && profile?.date_of_birth && (
                <div className="profile-meta-item">
                  <Cake
                    size={18}
                    weight="regular"
                    className="profile-meta-icon"
                  />
                  <span>
                    Born{" "}
                    {formatDateOnly(profile.date_of_birth, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
              )}

              <div className="profile-meta-item">
                <ShieldCheck
                  size={18}
                  weight="regular"
                  className="profile-meta-icon"
                />
                <span
                  className={`profile-badge ${profile?.privacy === PROFILE_PRIVACY.PRIVATE ? "private" : ""}`}
                >
                  {profile?.privacy === PROFILE_PRIVACY.PRIVATE
                    ? "Private Account"
                    : "Public Account"}
                </span>
              </div>
            </div>

            {/* Secondary Actions (Requests / Logout / Message) */}
            {isOwnProfile ? (
              <div className="profile-secondary-actions">
                <button
                  type="button"
                  className="profile-secondary-btn"
                  onClick={() => navigateTo("/follow-requests")}
                >
                  Follow requests
                </button>
                <button
                  type="button"
                  className="profile-secondary-btn danger"
                  onClick={handleLogout}
                >
                  <SignOut size={16} weight="bold" />
                  Log out
                </button>
              </div>
            ) : (
              <div className="profile-secondary-actions">
                <button
                  type="button"
                  className="profile-secondary-btn"
                  onClick={() =>
                    navigateTo(`/messages/${id}`, {
                      state: {
                        chatUser: {
                          id: profile.id,
                          first_name: profile.first_name,
                          last_name: profile.last_name,
                          nickname: profile.nickname,
                          avatar_path: profile.avatar_path,
                        },
                      },
                    })
                  }
                >
                  Message
                </button>
              </div>
            )}
          </aside>

          {/* ==================== MAIN BODY ==================== */}

          <section className="profile-main-body">
            {/* Top Bar: Followers + Following counts */}
            <div className="profile-stats-card">
              <button
                type="button"
                className={`profile-stat-box ${activeTab === "followers" ? "active" : ""}`}
                onClick={() => handleTabChange("followers")}
              >
                <span className="profile-stat-number">{followersCount}</span>
                <span className="profile-stat-label">Followers</span>
              </button>

              <div className="profile-stat-divider" />

              <button
                type="button"
                className={`profile-stat-box ${activeTab === "following" ? "active" : ""}`}
                onClick={() => handleTabChange("following")}
              >
                <span className="profile-stat-number">{followingCount}</span>
                <span className="profile-stat-label">Following</span>
              </button>

              <div className="profile-stat-divider" />

              <button
                type="button"
                className={`profile-stat-box ${activeTab === "posts" ? "active" : ""}`}
                onClick={() => handleTabChange("posts")}
              >
                <span className="profile-stat-number">{postsCount}</span>
                <span className="profile-stat-label">Posts</span>
              </button>
            </div>

            <div className="profile-feed-container">
              {activeTab === "posts" &&
                (posts.length > 0 ? (
                  posts.map((post) => (
                    <PostCard
                      key={post.id}
                      post={{
                        ...post,
                        author_nickname: profile.nickname,
                        author_first_name: profile.first_name,
                        author_last_name: profile.last_name,
                        author_avatar_path: profile.avatar_path,
                      }}
                      currentUserID={profile.id}
                      isReacting={reactingPostID === post.id}
                      isDeleting={deletingPostID === post.id}
                      onLike={() => handlePostReaction(post.id)}
                      onComment={() => navigateTo(`/posts/${post.id}`)}
                      onDelete={() => handleDeletePost(post.id)}
                      onOpen={() => navigateTo(`/posts/${post.id}`)}
                    />
                  ))
                ) : (
                  <div className="profile-empty-feed">
                    <NotePencil
                      size={40}
                      className="profile-empty-icon"
                      weight="duotone"
                    />
                    <h3 className="profile-empty-title">No posts yet</h3>
                    <p className="profile-empty-text">
                      Posts created by {profile?.first_name || "this user"} will
                      appear here.
                    </p>
                  </div>
                ))}

              {/* TAB CONTENT: FOLLOWERS */}
              {activeTab === "followers" &&
                (listLoading ? (
                  <div className="profile-users-list">
                    <UserItemSkeleton count={3} />
                  </div>
                ) : listError ? (
                  <div className="profile-empty-feed">
                    <p className="form-error">{listError}</p>
                  </div>
                ) : followersList.length > 0 ? (
                  <div className="profile-users-list">
                    {followersList.map((u) => renderUserItem(u, false))}
                  </div>
                ) : (
                  <div className="profile-empty-feed">
                    <Users
                      size={40}
                      className="profile-empty-icon"
                      weight="duotone"
                    />
                    <h3 className="profile-empty-title">No followers yet</h3>
                    <p className="profile-empty-text">
                      When people follow {profile?.first_name || "this user"},
                      they will appear here.
                    </p>
                  </div>
                ))}

              {/* TAB CONTENT: FOLLOWING */}
              {activeTab === "following" &&
                (listLoading ? (
                  <div className="profile-users-list">
                    <UserItemSkeleton count={3} />
                  </div>
                ) : listError ? (
                  <div className="profile-empty-feed">
                    <p className="form-error">{listError}</p>
                  </div>
                ) : followingList.length > 0 ? (
                  <div className="profile-users-list">
                    {followingList.map((u) => renderUserItem(u, true))}
                  </div>
                ) : (
                  <div className="profile-empty-feed">
                    <UserPlus
                      size={40}
                      className="profile-empty-icon"
                      weight="duotone"
                    />
                    <h3 className="profile-empty-title">
                      Not following anyone yet
                    </h3>
                    <p className="profile-empty-text">
                      Users that {profile?.first_name || "this user"} follows
                      will appear here.
                    </p>
                  </div>
                ))}
            </div>
          </section>
        </div>
      </div>

      {isEditModalOpen && profile && (
        <EditProfileModal
          profile={profile}
          onClose={() => setIsEditModalOpen(false)}
          onSave={handleProfileSave}
        />
      )}
    </main>
  );
}
