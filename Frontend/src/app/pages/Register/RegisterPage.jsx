import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { registerUser } from '../../../api/auth'

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
  const [form, setForm] = useState(initialForm)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  function updateField(event) {
    const { name, value } = event.target
    setForm((currentForm) => ({ ...currentForm, [name]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
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
      setError(requestError.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card" aria-labelledby="register-title">
        <p className="auth-eyebrow">Join the conversation</p>
        <h1 id="register-title">Create your account</h1>
        <p className="auth-description">Start sharing with the people and groups you care about.</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <label>First name<input name="first_name" value={form.first_name} onChange={updateField} autoComplete="given-name" required /></label>
            <label>Last name<input name="last_name" value={form.last_name} onChange={updateField} autoComplete="family-name" required /></label>
          </div>
          <label>Email<input type="email" name="email" value={form.email} onChange={updateField} autoComplete="email" required /></label>
          <label>Password<input type="password" name="password" value={form.password} onChange={updateField} autoComplete="new-password" minLength="6" required /></label>
          <label>Date of birth<input type="date" name="date_of_birth" value={form.date_of_birth} onChange={updateField} required /></label>
          <label>Nickname <span>(optional)</span><input name="nickname" value={form.nickname} onChange={updateField} autoComplete="nickname" /></label>
          <label>About me <span>(optional)</span><textarea name="about_me" value={form.about_me} onChange={updateField} rows="3" /></label>

          {error && <p className="form-error" role="alert">{error}</p>}

          <button className="primary-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="auth-switch">Already have an account? <Link to="/login">Log in</Link></p>
      </section>
    </main>
  )
}
