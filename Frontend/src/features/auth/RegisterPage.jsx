import { useEffect, useRef, useState } from "react";
import { ImageSquare } from "@phosphor-icons/react";
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

export default function RegisterPage() {
  const navigate = useNavigate();
  const { error: showError, warning: showWarning } = useToast();
  const [form, setForm] = useState(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState(1);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [selectedImageSrc, setSelectedImageSrc] = useState("");
  const [nicknameError, setNicknameError] = useState("");
  const avatarInputRef = useRef(null);
  const [isDraggingAvatar, setIsDraggingAvatar] = useState(false);

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
    if (name === "nickname") setNicknameError("");
  }

  function openAvatarCropper(file) {
    if (!file || isSubmitting || selectedImageSrc) return;

    if (!["image/jpeg", "image/png", "image/gif"].includes(file.type)) {
      showError("Unsupported image", "Please choose a JPEG, PNG, or GIF.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setSelectedImageSrc(reader.result);
    reader.onerror = () =>
      showError("Cannot open image", "Please choose another image.");
    reader.readAsDataURL(file);
  }

  function handleFileSelect(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    openAvatarCropper(file);
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
      if (requestError.message === "nickname is already taken") {
        setNicknameError("That nickname is already taken. Try another one.");
        return;
      }
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

      <section className="auth-card loop-glass-surface" aria-labelledby="register-title">
        <p className="auth-eyebrow">Join the conversation</p>
        <h1 id="register-title">Create your account</h1>
        <p className="auth-description">
          Start sharing with the people and groups you care about.
        </p>

        <form className="auth-form loop-form" onSubmit={handleSubmit}>
          {step === 1 && (
            <>
              <div className="form-row">
                <label className="loop-form__field">
                  First name
                  <input
                    name="first_name"
                    className="loop-form__control"
                    value={form.first_name}
                    onChange={updateField}
                    autoComplete="given-name"
                    required
                  />
                </label>

                <label className="loop-form__field">
                  Last name
                  <input
                    name="last_name"
                    className="loop-form__control"
                    value={form.last_name}
                    onChange={updateField}
                    autoComplete="family-name"
                    required
                  />
                </label>
              </div>

              <label className="loop-form__field">
                Email
                <input
                  type="email"
                name="email"
                className="loop-form__control"
                  value={form.email}
                  onChange={updateField}
                  autoComplete="email"
                  required
                />
              </label>
              <label className="loop-form__field">
                Password
                <input
                  type="password"
                name="password"
                className="loop-form__control"
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

              <label className="loop-form__field">
                Date of birth
                <input
                  type="date"
                name="date_of_birth"
                className="loop-form__control"
                  value={form.date_of_birth}
                  onChange={updateField}
                  required
                />
              </label>
            </>
          )}

          {step === 2 && (
            <>
              <div className="auth-avatar-field">
                <label htmlFor="register-avatar">
                  Profile photo <span>(optional)</span>
                </label>

                <input
                  id="register-avatar"
                  ref={avatarInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/gif"
                  onChange={handleFileSelect}
                  disabled={isSubmitting}
                  hidden
                />

                <button
                  type="button"
                  aria-label="Choose a profile photo (optional)"
                  className={`auth-avatar-dropzone loop-media-dropzone${
                    isDraggingAvatar
                      ? " loop-media-dropzone--dragging"
                    : ""
                  }`}
                  disabled={isSubmitting}
                  onClick={() => avatarInputRef.current?.click()}
                  onDragEnter={(event) => {
                    event.preventDefault();
                    if (!isSubmitting) setIsDraggingAvatar(true);
                  }}
                  onDragOver={(event) => event.preventDefault()}
                  onDragLeave={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget)) {
                      setIsDraggingAvatar(false);
                    }
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    setIsDraggingAvatar(false);
                    openAvatarCropper(event.dataTransfer.files[0]);
                  }}
                >
                  <ImageSquare size={21} weight="bold" />
                  <span>
                    <strong>Drop image or GIF</strong>
                    <small>or choose a JPEG, PNG, or GIF</small>
                  </span>
                </button>
              </div>

              {avatarPreview && (
                <img
                  src={avatarPreview}
                  alt="Selected profile photo"
                  className="auth-avatar-preview"
                />
              )}

              <label className="loop-form__field">
                Nickname <span>(optional)</span>
                <input
                  name="nickname"
                  className="loop-form__control"
                  value={form.nickname}
                  onChange={updateField}
                  autoComplete="nickname"
                />
                {nicknameError && (
                  <p className="auth-field-error" role="alert">
                    {nicknameError}
                  </p>
                )}
              </label>

              <label className="loop-form__field">
                About me <span>(optional)</span>
                <textarea
                  name="about_me"
                  className="loop-form__control"
                  value={form.about_me}
                  onChange={updateField}
                  rows="3"
                />
              </label>
            </>
          )}

          <div className="auth-actions loop-form__footer">
            {step === 2 && (
              <button
                className="primary-button loop-button loop-button--secondary"
                type="button"
                onClick={() => setStep(1)}
                disabled={isSubmitting}
              >
                Back
              </button>
            )}

            <button
              className="primary-button loop-button loop-button--primary"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? "Creating account…"
                : step === 1
                  ? "Next"
                  : "Create account"}
            </button>
          </div>

          <div
            className="auth-steps"
            role="group"
            aria-label={`Registration step ${step} of 2`}
          >
            <span
              aria-current={step === 1 ? "step" : undefined}
              className="auth-step auth-step--complete"
            >
              {step === 1 ? "1" : "✓"}
            </span>
            <span className={`auth-step-line${step === 2 ? " auth-step-line--complete" : ""}`} aria-hidden="true" />
            <span
              aria-current={step === 2 ? "step" : undefined}
              className={`auth-step${step === 2 ? " auth-step--complete" : ""}`}
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
