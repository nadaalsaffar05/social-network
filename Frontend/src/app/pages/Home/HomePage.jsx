import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { logoutUser } from '../../../api/auth'
import { getProfile } from '../../../api/Profile.js'

export default function HomePage() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true

    async function loadUser() {
      try {
        const currentUser = await getProfile()
        if (isMounted) setUser(currentUser)
      } catch (requestError) {
        if (requestError.message === 'unauthorized') {
          navigate('/login', { replace: true })
          return
        }

        if (isMounted) setError(requestError.message)
      }
    }

    loadUser()
    return () => { isMounted = false }
  }, [navigate])

  async function handleLogout() {
    try {
      await logoutUser()
      navigate('/login', { replace: true })
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  if (error) return <main className="auth-page"><p className="form-error">{error}</p></main>
  if (!user) return <main className="auth-page"><p>Loading your profile…</p></main>

  return (
    <main className="home-page">
      <section className="home-card">
        <p className="auth-eyebrow">Signed in</p>
        <h1>Welcome, {user.first_name}!</h1>
        <p>{user.email}</p>
        <button className="primary-button" type="button" onClick={handleLogout}>Log out</button>
      </section>
    </main>
  )
}
