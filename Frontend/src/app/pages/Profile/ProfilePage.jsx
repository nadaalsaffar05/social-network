import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getProfile } from '../../../api/users'
import { logoutUser } from '../../../api/auth'
import { BASE_API } from '../../../Config.js'

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

  return (
    <main className="home-page">
      <section className="home-card">
        <p className="auth-eyebrow">User Profile</p>

        {/* Avatar + name row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '12px' }}>
          {avatarUrl ? (
            <img
              id="profile-avatar"
              src={avatarUrl}
              alt={`${profile?.first_name} ${profile?.last_name}`}
              style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '2px solid var(--color-border)',
                flexShrink: 0,
              }}
            />
          ) : (
            <div
              id="profile-avatar-initials"
              style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.4rem',
                fontWeight: '700',
                color: '#fff',
                flexShrink: 0,
              }}
            >
              {initials}
            </div>
          )}

          <div>
            <h1 style={{ marginTop: 0 }}>
              {profile?.first_name} {profile?.last_name}
            </h1>
            {profile?.nickname && (
              <p className="auth-description" style={{ marginTop: '2px' }}>
                @{profile.nickname}
              </p>
            )}
          </div>
        </div>

        <p style={{ marginTop: '20px' }}>
          <strong>Email:</strong> {profile?.email}
        </p>
        {profile?.date_of_birth && (
          <p>
            <strong>Date of Birth:</strong> {profile.date_of_birth}
          </p>
        )}
        {profile?.about_me && (
          <p style={{ marginTop: '8px' }}>
            <strong>About:</strong> {profile.about_me}
          </p>
        )}
        <p
          style={{
            marginTop: '8px',
            fontSize: '0.85rem',
            color: 'var(--color-text-faint)',
          }}
        >
          <strong>Privacy:</strong> {profile?.privacy === 1010 ? 'Private' : 'Public'}
        </p>

        <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
          <button
            className="primary-button"
            type="button"
            onClick={() => navigate('/home')}
          >
            Home
          </button>
          <button
            className="primary-button"
            type="button"
            style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text)',
            }}
            onClick={handleLogout}
          >
            Log out
          </button>
        </div>
      </section>
    </main>
  )
}