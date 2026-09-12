import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { loginUser } from '../../api/auth.js'
import { useToast } from '../../shared/components/toast/useToast.js'
import AuthBackground from './components/AuthBackground.jsx'

export default function LoginPage() {
  const navigate = useNavigate()
  const { error: showError } = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setIsSubmitting(true)

    try {
      await loginUser({ email, password })
      navigate('/home', { replace: true })
    } catch (requestError) {
      showError('Could not log in', requestError.message || 'Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <AuthBackground />

      <section className="auth-card" aria-labelledby="login-title">
        <p className="auth-eyebrow">Welcome back</p>
        <h1 id="login-title">Log in to loop</h1>
        <p className="auth-description">Connect with your communities and friends.</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              minLength="6"
              required
            />
          </label>

          <button className="primary-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Logging in…' : 'Log in'}
          </button>
        </form>

        <p className="auth-switch">
          New to loop? <Link to="/register">Create an account</Link>
        </p>
      </section>
    </main>
  )
}
