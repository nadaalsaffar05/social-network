import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getProfile } from '../../../api/users'
import { logoutUser } from '../../../api/auth'
import { BASE_API } from '../../../Config.js'
import './ProfilePage.css'

export default function ProfilePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

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
          {/* Profile Picture (PFP) */}
          <div className="profile-avatar-wrapper">
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
              <strong>Email:</strong> <span>{profile?.email}</span>
            </div>
            {profile?.date_of_birth && (
              <div className="profile-detail-item">
                <strong>Born:</strong> <span>{formatDate(profile.date_of_birth)}</span>
              </div>
            )}
            <div className="profile-detail-item" style={{ marginTop: '4px' }}>
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
              Home
            </button>
            <button
              className="profile-action-btn secondary"
              type="button"
              onClick={handleLogout}
            >
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
                      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                      Like
                    </button>
                    <button type="button" className="post-action-item">
                      <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      Comment
                    </button>
                  </div>
                </article>
              ))
            ) : (
              <div className="profile-empty-feed">
                <div className="profile-empty-icon">📝</div>
                <h3 className="profile-empty-title">No posts yet</h3>
                <p className="profile-empty-text">
                  Posts created by {profile?.first_name || 'this user'} will appear here.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}