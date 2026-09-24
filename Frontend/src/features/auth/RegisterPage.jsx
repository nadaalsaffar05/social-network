import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { registerUser } from "../../api/auth.js";
import { uploadAvatar } from "../../api/Profile.js";
import AvatarCropperModal from "../../shared/components/avatar-cropper/AvatarCropperModal.jsx";
import { useToast } from "../../shared/components/toast/useToast.js";
import AuthBackground from "./components/AuthBackground.jsx";

const initialForm = {
  email: "",
  password: "",
  first_name: "",
  last_name: "",
  date_of_birth: "",
  nickname: "",
  about_me: "",
};

const stepCircleStyle = {
  display: "grid",
  placeItems: "center",
  width: 32,
  height: 32,
  borderRadius: "50%",
  fontWeight: 700,
};

export default function RegisterPage() {
  const navigate = useNavigate();
  const { error: showError, warning: showWarning } = useToast();
  const [form, setForm] = useState(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState(1);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [selectedImageSrc, setSelectedImageSrc] = useState("");

  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  const passwordChecks = [
    ["At least 6 characters", form.password.length >= 6],
    ["An uppercase letter", /[A-Z]/.test(form.password)],
    ["A lowercase letter", /[a-z]/.test(form.password)],
    ["A number", /\d/.test(form.password)],
    ["A special character", /[^a-zA-Z\d]/.test(form.password)],
  ];

  function updateField(event) {
    const { name, value } = event.target;
    setForm((currentForm) => ({ ...currentForm, [name]: value }));
  }

  function handleFileSelect(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => setSelectedImageSrc(reader.result);
    reader.onerror = () =>
      showError("Cannot open image", "Please choose another image.");
    reader.readAsDataURL(file);
  }

  function handleCropSave(croppedFile) {
    setAvatarFile(croppedFile);
    setAvatarPreview(URL.createObjectURL(croppedFile));
    setSelectedImageSrc("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (isSubmitting || selectedImageSrc) return;

    // The existing required/email/password rules validate step 1 first.
    if (step === 1) {
      setStep(2);
      return;
    }

    setIsSubmitting(true);

    const user = {
      ...form,
      nickname: form.nickname || null,
      about_me: form.about_me || null,
    };

    try {
      await registerUser(user);

      // Upload after registration creates the session required by this API.
      if (avatarFile) {
        try {
          await uploadAvatar(avatarFile);
        } catch {
          showWarning(
            "Account created; photo not uploaded",
            "You can add your photo later from Edit Profile.",
          );
        }
      }

      navigate("/home", { replace: true });
    } catch (requestError) {
      showError(
        "Failed to create your account",
        requestError.message || "Please check your details and try again",
      );
    } finally {
      setIsSubmitting(false);
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
          {step === 1 && (
            <>
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
                  title="Password must be at least 6 characters and contain uppercase, lowercase, number, and special character"
                  autoComplete="new-password"
                  required
                />
              </label>
              <ul
                className="password-requirements"
                aria-label="Password requirements"
              >
                {passwordChecks.map(([label, met]) => (
                  <li key={label} className={met ? "is-met" : ""}>
                    <span aria-hidden="true">{met ? "✓" : "•"}</span>
                    {label}
                  </li>
                ))}
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

            </>
          )}

          {step === 2 && (
            <>
              <label>
                Profile photo <span>(optional)</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/gif"
                  onChange={handleFileSelect}
                  disabled={isSubmitting}
                />
              </label>

              {avatarPreview && (
                <img
                  src={avatarPreview}
                  alt="Selected profile photo"
                  style={{ width: 80, height: 80, borderRadius: "50%", objectFit: "cover" }}
                />
              )}

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
                <textarea
                  name="about_me"
                  value={form.about_me}
                  onChange={updateField}
                  rows="3"
                />
              </label>

            </>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            {step === 2 && (
              <button
                className="primary-button"
                type="button"
                onClick={() => setStep(1)}
                disabled={isSubmitting}
              >
                Back
              </button>
            )}

            <button
              className="primary-button"
              type="submit"
              disabled={isSubmitting}
              style={{ marginLeft: "auto" }}
            >
              {isSubmitting
                ? "Creating account…"
                : step === 1
                  ? "Next"
                  : "Create account"}
            </button>
          </div>

          <div
            role="group"
            aria-label={`Registration step ${step} of 2`}
            style={{ display: "flex", alignItems: "center", gap: 12 }}
          >
            <span
              aria-current={step === 1 ? "step" : undefined}
              style={{ ...stepCircleStyle, background: "var(--color-primary)", color: "#fff" }}
            >
              {step === 1 ? "1" : "✓"}
            </span>
            <span
              aria-hidden="true"
              style={{
                flex: 1,
                height: 2,
                background: step === 2 ? "var(--color-primary)" : "var(--color-border)",
                transition: "background 250ms",
              }}
            />
            <span
              aria-current={step === 2 ? "step" : undefined}
              style={{
                ...stepCircleStyle,
                background: step === 2 ? "var(--color-primary)" : "var(--color-surface)",
                color: "var(--color-text)",
              }}
            >
              2
            </span>
          </div>
        </form>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </section>

      {selectedImageSrc && (
        <AvatarCropperModal
          imageSrc={selectedImageSrc}
          onClose={() => setSelectedImageSrc("")}
          onCropSave={handleCropSave}
        />
      )}
    </main>
  );
}