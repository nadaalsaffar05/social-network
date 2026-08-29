import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loginUser } from "../../../api/auth";
import WebThreads from "../../../components/WebThreads/WebThreads";

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await loginUser({ email, password });
      navigate("/home", { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="auth-page">

      <div className="auth-background">
  <WebThreads
    color1="#4F7DF3"
    color2="#806BFF"
    color3="#B8C8FF"
    speed={0.08}
    threadCount={5}
    frequency={5}
    spread={0.2}
    taper={1}
    position={0.5}
    fanMode="center"
    glow={0.035}
    falloff={0.65}
    thickness={1}
    brightness={0.4}
    opacity={0.55}
    mirror
    shimmer={false}
    grain
    grainIntensity={0.03}
    mouseInteraction
    mouseStrength={0.15}
  />
</div>

      <section className="auth-card" aria-labelledby="login-title">
        <p className="auth-eyebrow">Welcome back</p>
        <h1 id="login-title">Log in to Loop</h1>
        <p className="auth-description">
          Connect with your communities and friends.
        </p>

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

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          <button
            className="primary-button"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Logging in…" : "Log in"}
          </button>
        </form>

        <p className="auth-switch">
          New to Loop? <Link to="/register">Create an account</Link>
        </p>
      </section>
    </main>
  );
}
