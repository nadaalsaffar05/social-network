import { useEffect, useState, useRef } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Camera, House, SignOut, NotePencil, EnvelopeSimple, Cake, ShieldCheck, Users, UserCheck, UserPlus } from '@phosphor-icons/react'
import { followUser, getFollowers, getFollowing, getProfile, getPublicProfile, isFollowing, unfollowUser, uploadAvatar } from '../../api/profile.js'
import { deletePost, togglePostReaction } from '../../api/feed.js'
import { logoutUser } from '../../api/auth'
import { BASE_API } from '../../config/api.js'
import AvatarCropperModal from '../../shared/components/avatar-cropper/AvatarCropperModal'
import PostCard from '../feed/components/PostCard.jsx'
import GradientWaves from '../feed/components/GradientWaves.jsx'
import { GRADIENT_WAVE_PROPS } from '../feed/constants.js'
import { useToast } from '../../shared/components/toast/useToast.js'
import './ProfilePage.css'

export default function ProfilePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { error: showError } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const fileInputRef = useRef(null)

  const activeTab = searchParams.get('tab') || 'posts'

  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [reactingPostID, setReactingPostID] = useState('')
  const [deletingPostID, setDeletingPostID] = useState('')
  const [selectedImageSrc, setSelectedImageSrc] = useState(null)
  const [isCropperOpen, setIsCropperOpen] = useState(false)
  const [isFollowingProfile, setIsFollowingProfile] = useState(false)

  const [followersList, setFollowersList] = useState([])
  const [followingList, setFollowingList] = useState([])
  const [failedAvatarIDs, setFailedAvatarIDs] = useState(new Set())
  const [listLoading, setListLoading] = useState(false)
  const [listError, setListError] = useState('')
  const isOwnProfile = !id

  function handleTabChange(newTab) {
    setSearchParams(newTab === 'posts' ? {} : { tab: newTab })
  }


  useEffect(() => {
    let isMounted = true

    async function loadProfile() {
      try {
        setLoading(true)
        const userProfile = id ? await getPublicProfile(id) : await getProfile()
        const relationship = id ? await isFollowing(id) : null
        if (isMounted) {
          setProfile(userProfile)
          setIsFollowingProfile(relationship?.is_following ?? false)
        }
      } catch (requestError) {
        if (
          requestError.message === 'unauthorized' ||
          requestError.message === 'authentication required' ||
          requestError.message === 'session expired or invalid'
        ) {
          navigate('/login', { replace: true })
          return
        }
        if (isMounted) {
          showError('Could not load profile', requestError.message || 'Please try again.')
          navigate('/home', { replace: true })
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    loadProfile()
    return () => {
      isMounted = false
    }
  }, [navigate, id, showError])

  useEffect(() => {
    let isMounted = true

    async function loadTabData() {
      if (activeTab === 'followers') {
        try {
          setListLoading(true)
          setListError('')
          const data = await getFollowers(id)
          if (isMounted) setFollowersList(data)
        } catch (err) {
          if (isMounted) setListError(err.message || 'Failed to load followers')
        } finally {
          if (isMounted) setListLoading(false)
        }
      } else if (activeTab === 'following') {
        try {
          setListLoading(true)
          setListError('')
          const data = await getFollowing(id)
          if (isMounted) setFollowingList(data)
        } catch (err) {
          if (isMounted) setListError(err.message || 'Failed to load following list')
        } finally {
          if (isMounted) setListLoading(false)
        }
      }
    }

    loadTabData()
    return () => {
      isMounted = false
    }
  }, [activeTab, id])


  async function handleLogout() {
    try {
      await logoutUser()
      navigate('/login', { replace: true })
    } catch (requestError) {
      showError('Could not log out', requestError.message)
    }
  }

  function handleAvatarClick() {
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
      fileInputRef.current.click()
    }
  }

  function handleFileSelect(e) {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]
      const reader = new FileReader()
      reader.addEventListener('load', () => {
        setSelectedImageSrc(reader.result)
        setIsCropperOpen(true)
      })
      reader.readAsDataURL(file)
    }
  }

  async function handleCropSave(croppedFile) {
    try {
      const result = await uploadAvatar(croppedFile)
      if (result.avatar_path) {
        setProfile((prev) => (prev ? { ...prev, avatar_path: result.avatar_path } : prev))
      }
      setIsCropperOpen(false)
      setSelectedImageSrc(null)
    } catch (err) {
      showError('Could not update avatar', err.message || 'Please try again.')
      setIsCropperOpen(false)
    }
  }

  if (loading) {
    return (
      <main className="auth-page">
        <p className="auth-description">Loading profile…</p>
      </main>
    )
  }

  const mediaUrl = (path) => new URL(`/${String(path).replace(/^\/+/, '')}`, BASE_API).toString()
  const avatarUrl = profile?.avatar_path ? mediaUrl(profile.avatar_path) : null

  const initials = `${profile?.first_name?.[0] ?? ''}${profile?.last_name?.[0] ?? ''}`.toUpperCase()
  const fullName = `${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim()
  const username = profile?.nickname ? `@${profile.nickname}` : (profile?.email ? `@${profile.email.split('@')[0]}` : '')

  const followersCount = profile?.followers_count ?? 0
  const followingCount = profile?.following_count ?? 0
  const postsCount = profile?.posts_count ?? (profile?.posts?.length ?? 0)
  const posts = profile?.posts ?? []

  function formatDate(dateStr) {
    if (!dateStr) return ''
    try {
      const d = new Date(dateStr)
      return d.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    } catch {
      return dateStr
    }
  }

  async function refreshProfile() {
    const nextProfile = id ? await getPublicProfile(id) : await getProfile()
    setProfile(nextProfile)
  }

  async function handleFollowProfile() {
    try {
      const response = await followUser(id)
      setIsFollowingProfile(response.status === 'following')
    } catch (requestError) {
      showError('Could not follow user', requestError.message || 'Please try again.')
    }
  }

  async function handleUnfollowProfile() {
    try {
      await unfollowUser(id)
      setIsFollowingProfile(false)
    } catch (requestError) {
      showError('Could not unfollow user', requestError.message || 'Please try again.')
    }
  }

  async function handlePostReaction(postId) {
    setReactingPostID(postId)
    try { await togglePostReaction(postId, 'LIKE'); await refreshProfile() } catch (requestError) { showError('Could not update reaction', requestError.message || 'Please try again.') } finally { setReactingPostID('') }
  }

  async function handleDeletePost(postId) {
    if (!window.confirm('Delete this post?')) return
    setDeletingPostID(postId)
    try { await deletePost(postId); await refreshProfile() } catch (requestError) { showError('Could not delete post', requestError.message || 'Please try again.') } finally { setDeletingPostID('') }
  }

  function renderUserCard(u) {
    const uInitials = `${u.first_name?.[0] ?? ''}${u.last_name?.[0] ?? ''}`.toUpperCase()
    const uFullName = `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim()
    const uHandle = u.nickname ? `@${u.nickname}` : (u.email ? `@${u.email.split('@')[0]}` : '')
    const uAvatarUrl = u.avatar_path && !failedAvatarIDs.has(u.id) ? mediaUrl(u.avatar_path) : null

    return (
      <div key={u.id} className="profile-user-card">
        <div className="user-card-avatar-wrapper">
          {uAvatarUrl ? (
            <img
              src={uAvatarUrl}
              alt=""
              className="user-card-avatar-img"
              onError={() => setFailedAvatarIDs((previous) => new Set(previous).add(u.id))}
            />
          ) : (
            <div className="user-card-avatar-initials">{uInitials}</div>
          )}
        </div>
        <div className="user-card-info">
          <h4 className="user-card-name">{uFullName}</h4>
          {uHandle && <span className="user-card-handle">{uHandle}</span>}
          <div className="user-card-badge-row">
            <span className={`profile-badge ${u.privacy === 1010 ? 'private' : ''}`}>
              {u.privacy === 1010 ? 'Private' : 'Public'}
            </span>
          </div>
        </div>
        <button
          type="button"
          className="user-card-action-btn"
          onClick={() => navigate(`/profile/${u.id}`)}
        >
          View Profile
        </button>
      </div>
    )
  }

  return (
    <main className="profile-layout-container">
      <div className="profile-waves">
        <GradientWaves {...GRADIENT_WAVE_PROPS} />
      </div>
      <div className="profile-page-content">
        <header className="profile-page-topbar">
          <button type="button" aria-label="Go back" onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/home')}>
            <ArrowLeft size={22} />
          </button>
          <h1>Profile</h1>
        </header>
      <div className="profile-layout-grid">
        {/* ==================== LEFT SIDEBAR ==================== */}
        <aside className="profile-sidebar">
          {/* Hidden File Input */}
          {isOwnProfile && <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/jpeg,image/png,image/gif"
            style={{ display: 'none' }}
          />}

          {/* Profile Picture (PFP) */}
          <div
            className="profile-avatar-wrapper"
            onClick={isOwnProfile ? handleAvatarClick : undefined}
            title={isOwnProfile ? 'Click to change profile picture' : undefined}
          >
            {avatarUrl ? (
              <img
                id="profile-avatar"
                src={avatarUrl}
                alt={fullName}
                className="profile-avatar-img"
              />
            ) : (
              <div id="profile-avatar-initials" className="profile-avatar-initials">
                {initials}
              </div>
            )}
            {isOwnProfile && <div className="profile-avatar-overlay">
              <Camera size={24} weight="bold" />
              <span>Change</span>
            </div>}
          </div>

          {/* First Name & Username directly under PFP */}
          <div className="profile-names-section">
            <h1 className="profile-fullname">{fullName}</h1>
            {username && <p className="profile-username">{username}</p>}
          </div>

          {/* About Me / Bio */}
          {profile?.about_me && (
            <p className="profile-bio">{profile.about_me}</p>
          )}

          {/* User Details */}
          <div className="profile-details-list">
            {isOwnProfile && <div className="profile-detail-item">
              <EnvelopeSimple size={16} weight="bold" />
              <strong>Email:</strong> <span>{profile?.email}</span>
            </div>}
            {isOwnProfile && profile?.date_of_birth && (
              <div className="profile-detail-item">
                <Cake size={16} weight="bold" />
                <strong>Born:</strong> <span>{formatDate(profile.date_of_birth)}</span>
              </div>
            )}
            <div className="profile-detail-item" style={{ marginTop: '4px' }}>
              <ShieldCheck size={16} weight="bold" />
              <strong>Account:</strong>
              <span className={`profile-badge ${profile?.privacy === 1010 ? 'private' : ''}`}>
                {profile?.privacy === 1010 ? 'Private' : 'Public'}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="profile-sidebar-actions">
            {isOwnProfile ? <>
            <button
              className="primary-button profile-action-btn"
              type="button"
              onClick={() => navigate('/home')}
            >
              <House size={18} weight="bold" />
              Home
            </button>
            <button
              className="profile-action-btn secondary"
              type="button"
              onClick={() => navigate('/follow-requests')}
            >
              Follow requests
            </button>
            <button
              className="profile-action-btn secondary"
              type="button"
              onClick={handleLogout}
            >
              <SignOut size={18} weight="bold" />
              Log out
            </button>
            </> : <>
            <button
              className={isFollowingProfile ? 'profile-action-btn secondary' : 'primary-button profile-action-btn'}
              type="button"
              onClick={isFollowingProfile ? handleUnfollowProfile : handleFollowProfile}
            >
              {isFollowingProfile ? 'Unfollow' : 'Follow'}
            </button>
            <button className="profile-action-btn secondary" type="button" onClick={() => navigate(`/messages/${id}`)}>Message</button>
            </>}
          </div>
        </aside>

        {/* ==================== MAIN BODY ==================== */}

        <section className="profile-main-body">
          {/* Top Bar: Followers + Following counts */}
          <div className="profile-stats-card">
            <button
              type="button"
              className={`profile-stat-box ${activeTab === 'followers' ? 'active' : ''}`}
              onClick={() => handleTabChange('followers')}
            >
              <span className="profile-stat-number">{followersCount}</span>
              <span className="profile-stat-label">Followers</span>
            </button>

            <div className="profile-stat-divider" />

            <button
              type="button"
              className={`profile-stat-box ${activeTab === 'following' ? 'active' : ''}`}
              onClick={() => handleTabChange('following')}
            >
              <span className="profile-stat-number">{followingCount}</span>
              <span className="profile-stat-label">Following</span>
            </button>

            <div className="profile-stat-divider" />

            <button
              type="button"
              className={`profile-stat-box ${activeTab === 'posts' ? 'active' : ''}`}
              onClick={() => handleTabChange('posts')}
            >
              <span className="profile-stat-number">{postsCount}</span>
              <span className="profile-stat-label">Posts</span>
            </button>
          </div>

          {/* User Posts / Followers / Following Feed */}
          <div className="profile-feed-container">
            {/* Navigation Tabs Header */}
            <div className="profile-tabs-header">
              <button
                type="button"
                className={`profile-tab-btn ${activeTab === 'posts' ? 'active' : ''}`}
                onClick={() => handleTabChange('posts')}
              >
                <NotePencil size={18} weight="bold" />
                Posts
                <span className="profile-tab-badge">{postsCount}</span>
              </button>
              <button
                type="button"
                className={`profile-tab-btn ${activeTab === 'followers' ? 'active' : ''}`}
                onClick={() => handleTabChange('followers')}
              >
                <Users size={18} weight="bold" />
                Followers
                <span className="profile-tab-badge">{followersCount}</span>
              </button>
              <button
                type="button"
                className={`profile-tab-btn ${activeTab === 'following' ? 'active' : ''}`}
                onClick={() => handleTabChange('following')}
              >
                <UserCheck size={18} weight="bold" />
                Following
                <span className="profile-tab-badge">{followingCount}</span>
              </button>
            </div>

            {/* TAB CONTENT: POSTS */}
            {activeTab === 'posts' && (
              posts.length > 0 ? (
                posts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={{ ...post, author_nickname: profile.nickname, author_first_name: profile.first_name, author_last_name: profile.last_name, author_avatar_path: profile.avatar_path }}
                    currentUserID={profile.id}
                    isReacting={reactingPostID === post.id}
                    isDeleting={deletingPostID === post.id}
                    onLike={() => handlePostReaction(post.id)}
                    onComment={() => navigate(`/posts/${post.id}`)}
                    onDelete={() => handleDeletePost(post.id)}
                    onOpen={() => navigate(`/posts/${post.id}`)}
                  />
                ))
              ) : (
                <div className="profile-empty-feed">
                  <NotePencil size={40} className="profile-empty-icon" weight="duotone" />
                  <h3 className="profile-empty-title">No posts yet</h3>
                  <p className="profile-empty-text">
                    Posts created by {profile?.first_name || 'this user'} will appear here.
                  </p>
                </div>
              )
            )}

            {/* TAB CONTENT: FOLLOWERS */}
            {activeTab === 'followers' && (
              listLoading ? (
                <div className="profile-empty-feed">
                  <p className="profile-empty-text">Loading followers…</p>
                </div>
              ) : listError ? (
                <div className="profile-empty-feed">
                  <p className="form-error">{listError}</p>
                </div>
              ) : followersList.length > 0 ? (
                <div className="profile-users-grid">
                  {followersList.map(renderUserCard)}
                </div>
              ) : (
                <div className="profile-empty-feed">
                  <Users size={40} className="profile-empty-icon" weight="duotone" />
                  <h3 className="profile-empty-title">No followers yet</h3>
                  <p className="profile-empty-text">
                    When people follow {profile?.first_name || 'this user'}, they will appear here.
                  </p>
                </div>
              )
            )}

            {/* TAB CONTENT: FOLLOWING */}
            {activeTab === 'following' && (
              listLoading ? (
                <div className="profile-empty-feed">
                  <p className="profile-empty-text">Loading following list…</p>
                </div>
              ) : listError ? (
                <div className="profile-empty-feed">
                  <p className="form-error">{listError}</p>
                </div>
              ) : followingList.length > 0 ? (
                <div className="profile-users-grid">
                  {followingList.map(renderUserCard)}
                </div>
              ) : (
                <div className="profile-empty-feed">
                  <UserPlus size={40} className="profile-empty-icon" weight="duotone" />
                  <h3 className="profile-empty-title">Not following anyone yet</h3>
                  <p className="profile-empty-text">
                    Users that {profile?.first_name || 'this user'} follows will appear here.
                  </p>
                </div>
              )
            )}
          </div>
        </section>

      </div>
      </div>

      {isCropperOpen && selectedImageSrc && (
        <AvatarCropperModal
          imageSrc={selectedImageSrc}
          onClose={() => {
            setIsCropperOpen(false)
            setSelectedImageSrc(null)
          }}
          onCropSave={handleCropSave}
        />
      )}
    </main>
  )
}
