import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getProfile } from '../../../api/users'
import { logoutUser } from '../../../api/auth'

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

  return (
    <main className="home-page">
      <section className="home-card">
        <p className="auth-eyebrow">User Profile</p>
        <h1>
          {profile?.first_name} {profile?.last_name}
        </h1>
        {profile?.nickname && (
          <p className="auth-description">@{profile.nickname}</p>
        )}
        <p style={{ marginTop: '12px' }}>
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