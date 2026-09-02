import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { registerUser } from '../../api/auth.js'
import { useToast } from '../../shared/components/toast/useToast.js'
import AuthBackground from './components/AuthBackground.jsx'

const initialForm = {
  email: '',
  password: '',
  first_name: '',
  last_name: '',
  date_of_birth: '',
  nickname: '',
  about_me: '',
}

export default function RegisterPage() {
  const navigate = useNavigate()
  const { error: showError } = useToast()
  const [form, setForm] = useState(initialForm)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const passwordChecks = [
    ['At least 6 characters', form.password.length >= 6],
    ['An uppercase letter', /[A-Z]/.test(form.password)],
    ['A lowercase letter', /[a-z]/.test(form.password)],
    ['A number', /\d/.test(form.password)],
    ['A special character', /[^a-zA-Z\d]/.test(form.password)],
  ]

  function updateField(event) {
    const { name, value } = event.target
    setForm((currentForm) => ({ ...currentForm, [name]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setIsSubmitting(true)

    const user = {
      ...form,
      nickname: form.nickname || null,
      about_me: form.about_me || null,
    }

    try {
      await registerUser(user)
      navigate('/home', { replace: true })
    } catch (requestError) {
      showError('Could not create your account', requestError.message || 'Please check your details and try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <AuthBackground />

      <section className="auth-card" aria-labelledby="register-title">
        <p className="auth-eyebrow">Join the conversation</p>
        <h1 id="register-title">Create your account</h1>
        <p className="auth-description">
          Start sharing with the people and groups you care about.
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <label>
              First name
              <input
                name="first_name"
                value={form.first_name}
                onChange={updateField}
                autoComplete="given-name"
                required
              />
            </label>

            <label>
              Last name
              <input
                name="last_name"
                value={form.last_name}
                onChange={updateField}
                autoComplete="family-name"
                required
              />
            </label>
          </div>

          <label>
            Email
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={updateField}
              autoComplete="email"
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={updateField}
              minLength={6}
              pattern="(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d]).{6,}"
              title="Password must be at least 6 characters and contain uppercase, lowercase, number, and special character."
              autoComplete="new-password"
              required
            />
          </label>
          <ul className="password-requirements" aria-label="Password requirements">
            {passwordChecks.map(([label, met]) => <li key={label} className={met ? 'is-met' : ''}><span aria-hidden="true">{met ? '✓' : '•'}</span>{label}</li>)}
          </ul>

          <label>
            Date of birth
            <input
              type="date"
              name="date_of_birth"
              value={form.date_of_birth}
              onChange={updateField}
              required
            />
          </label>

          <label>
            Nickname <span>(optional)</span>
            <input
              name="nickname"
              value={form.nickname}
              onChange={updateField}
              autoComplete="nickname"
            />
          </label>

          <label>
            About me <span>(optional)</span>
            <textarea name="about_me" value={form.about_me} onChange={updateField} rows="3" />
          </label>

          <button className="primary-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </section>
    </main>
  )
}
