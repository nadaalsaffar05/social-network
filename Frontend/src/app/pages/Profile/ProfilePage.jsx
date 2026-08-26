import { useEffect, useState, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Camera, House, SignOut, Heart, ChatCircle, NotePencil, EnvelopeSimple, Cake, ShieldCheck } from '@phosphor-icons/react'
import { getProfile, uploadAvatar } from '../../../api/Profile.js'
import { logoutUser } from '../../../api/auth'
import { BASE_API } from '../../../Config.js'
import AvatarCropperModal from '../../../components/AvatarCropperModal/AvatarCropperModal'
import './ProfilePage.css'

export default function ProfilePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedImageSrc, setSelectedImageSrc] = useState(null)
  const [isCropperOpen, setIsCropperOpen] = useState(false)

  useEffect(() => {
    let isMounted = true

    async function loadProfile() {
      try {
        setLoading(true)
        const userProfile = await getProfile()
        if (isMounted) {
          setProfile(userProfile)
          setError('')
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
          setError(requestError.message || 'Could not load profile')
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
  }, [navigate, id])

  async function handleLogout() {
    try {
      await logoutUser()
      navigate('/login', { replace: true })
    } catch (requestError) {
      setError(requestError.message)
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
      setError(err.message || 'Failed to upload avatar')
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

  if (error) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <p className="form-error">{error}</p>
          <button
            className="primary-button"
            style={{ marginTop: '16px' }}
            type="button"
            onClick={() => navigate('/home')}
          >
            Back to Home
          </button>
        </section>
      </main>
    )
  }

  const avatarUrl = profile?.avatar_path
    ? `${BASE_API}/static/${profile.avatar_path}`
    : null

  const initials = `${profile?.first_name?.[0] ?? ''}${profile?.last_name?.[0] ?? ''}`.toUpperCase()
  const fullName = `${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim()
  const username = profile?.nickname ? `@${profile.nickname}` : (profile?.email ? `@${profile.email.split('@')[0]}` : '')

  const followersCount = profile?.followers_count ?? 0
  const followingCount = profile?.following_count ?? 0
  const postsCount = profile?.posts_count ?? (profile?.posts?.length ?? 0)
  const posts = profile?.posts ?? []

  function getPrivacyLabel(code) {
    if (code === 1000 || code === 'PUBLIC') return 'Public'
    if (code === 1010 || code === 'FOLLOWERS') return 'Followers'
    if (code === 1020 || code === 'PRIVATE') return 'Private'
    return 'Public'
  }

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

  return (
    <main className="profile-layout-container">
      <div className="profile-layout-grid">
        {/* ==================== LEFT SIDEBAR ==================== */}
        <aside className="profile-sidebar">
          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="image/jpeg,image/png,image/gif"
            style={{ display: 'none' }}
          />

          {/* Profile Picture (PFP) */}
          <div
            className="profile-avatar-wrapper"
            onClick={handleAvatarClick}
            title="Click to change profile picture"
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
            <div className="profile-avatar-overlay">
              <Camera size={24} weight="bold" />
              <span>Change</span>
            </div>
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
            <div className="profile-detail-item">
              <EnvelopeSimple size={16} weight="bold" />
              <strong>Email:</strong> <span>{profile?.email}</span>
            </div>
            {profile?.date_of_birth && (
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
              onClick={handleLogout}
            >
              <SignOut size={18} weight="bold" />
              Log out
            </button>
          </div>
        </aside>

        {/* ==================== MAIN BODY ==================== */}
        <section className="profile-main-body">
          {/* Top Bar: Followers + Following counts */}
          <div className="profile-stats-card">
            <div className="profile-stat-box">
              <span className="profile-stat-number">{followersCount}</span>
              <span className="profile-stat-label">Followers</span>
            </div>

            <div className="profile-stat-divider" />

            <div className="profile-stat-box">
              <span className="profile-stat-number">{followingCount}</span>
              <span className="profile-stat-label">Following</span>
            </div>

            <div className="profile-stat-divider" />

            <div className="profile-stat-box">
              <span className="profile-stat-number">{postsCount}</span>
              <span className="profile-stat-label">Posts</span>
            </div>
          </div>

          {/* User Posts Feed */}
          <div className="profile-feed-container">
            <div className="profile-feed-header">
              <h2 className="profile-feed-title">
                Posts
                <span className="profile-feed-count-tag">{postsCount}</span>
              </h2>
            </div>

            {posts.length > 0 ? (
              posts.map((post) => (
                <article key={post.id} className="profile-post-card">
                  <div className="post-header">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={fullName}
                        className="post-avatar-mini"
                      />
                    ) : (
                      <div className="post-avatar-mini-initials">{initials}</div>
                    )}
                    <div className="post-meta">
                      <span className="post-author-name">{fullName}</span>
                      <div className="post-time-privacy">
                        <span>{formatDate(post.created_at)}</span>
                        <span>•</span>
                        <span className="profile-badge" style={{ fontSize: '0.7rem', padding: '1px 8px' }}>
                          {getPrivacyLabel(post.privacy)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <p className="post-content">{post.content}</p>

                  {post.media && post.media.length > 0 && (
                    <div className="post-media-grid">
                      {post.media.map((mPath, idx) => (
                        <img
                          key={idx}
                          src={`${BASE_API}/static/${mPath}`}
                          alt="Post attachment"
                          className="post-media-item"
                        />
                      ))}
                    </div>
                  )}

                  <div className="post-actions-bar">
                    <button type="button" className="post-action-item">
                      <Heart size={18} weight="bold" />
                      Like
                    </button>
                    <button type="button" className="post-action-item">
                      <ChatCircle size={18} weight="bold" />
                      Comment
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <div className="profile-empty-feed">
                <NotePencil size={40} className="profile-empty-icon" weight="duotone" />
                <h3 className="profile-empty-title">No posts yet</h3>
                <p className="profile-empty-text">
                  Posts created by {profile?.first_name || 'this user'} will appear here.
                </p>
              </div>
            )}
          </div>
        </section>
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