import { useState, useRef } from "react";
import {
  X,
  FloppyDisk,
  NotePencil,
  Camera,
} from "@phosphor-icons/react";
import { updateProfile, uploadAvatar } from "../../api/profile.js";
import AvatarCropperModal from "../../shared/components/avatar-cropper/AvatarCropperModal";
import Avatar from "../../shared/components/avatar/Avatar.jsx";
import { PROFILE_PRIVACY } from "../../shared/constants/enums.js";
import "./EditProfileModal.css";

export default function EditProfileModal({ profile, onClose, onSave }) {
  const [firstName, setFirstName] = useState(profile?.first_name || "");
  const [lastName, setLastName] = useState(profile?.last_name || "");
  const [nickname, setNickname] = useState(profile?.nickname || "");
  const [aboutMe, setAboutMe] = useState(profile?.about_me || "");
  const [dateOfBirth, setDateOfBirth] = useState(
    profile?.date_of_birth ? profile.date_of_birth.split("T")[0] : "",
  );
  const [privacy, setPrivacy] = useState(
    profile?.privacy ?? PROFILE_PRIVACY.PUBLIC,
  );

  const [newAvatarFile, setNewAvatarFile] = useState(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState(null);
  const [selectedImageSrc, setSelectedImageSrc] = useState(null);
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const fileInputRef = useRef(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function handleAvatarClick() {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  }

  function handleFileSelect(e) {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        setSelectedImageSrc(reader.result);
        setIsCropperOpen(true);
      });
      reader.readAsDataURL(file);
    }
  }

  function handleCropSave(croppedFile) {
    setNewAvatarFile(croppedFile);
    setAvatarPreviewUrl(URL.createObjectURL(croppedFile));
    setIsCropperOpen(false);
    setSelectedImageSrc(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!firstName.trim()) {
      setError("First name is required");
      return;
    }
    if (!lastName.trim()) {
      setError("Last name is required");
      return;
    }
    if (!dateOfBirth) {
      setError("Date of birth is required");
      return;
    }

    try {
      setSaving(true);

      let updatedAvatarPath = null;
      if (newAvatarFile) {
        const avatarRes = await uploadAvatar(newAvatarFile);
        updatedAvatarPath = avatarRes.avatar_path;
      }

      const updatedUser = await updateProfile({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        nickname: nickname.trim() || null,
        about_me: aboutMe.trim() || null,
        date_of_birth: dateOfBirth,
        privacy: Number(privacy),
      });

      if (updatedAvatarPath) {
        updatedUser.avatar_path = updatedAvatarPath;
      }

      onSave(updatedUser);
      onClose();
    } catch (err) {
      setError(err.message || "Failed to update profile — please try again");
    } finally {
      setSaving(false);
    }
  }

  const displayName = `${firstName.trim()} ${lastName.trim()}`.trim() || profile?.first_name || "Your Name";
  const displayUsername = nickname.trim()
    ? `@${nickname.trim()}`
    : profile?.nickname
      ? `@${profile.nickname}`
      : profile?.email
        ? `@${profile.email.split("@")[0]}`
        : "@username";

  return (
    <div className="edit-profile-modal-backdrop loop-glass-backdrop" onClick={onClose}>
      <div
        className="edit-profile-modal-card loop-glass-surface"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="edit-profile-modal-header">
          <div className="edit-profile-modal-title">
            <NotePencil
              size={22}
              weight="bold"
              className="edit-profile-icon-title"
            />
            <h3>Edit Profile</h3>
          </div>
          <button
            type="button"
            className="edit-profile-close-btn loop-icon-button"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={20} weight="bold" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="edit-profile-form">
          {error && <div className="edit-profile-error">{error}</div>}

          <div className="edit-profile-layout">
            {/* LEFT COLUMN: Avatar, Name, Username */}
            <div className="edit-profile-left-col">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="image/jpeg,image/png,image/gif"
                style={{ display: "none" }}
              />
              <div
                className="edit-avatar-preview-wrapper"
                onClick={handleAvatarClick}
                title="Change Profile Picture"
              >
                <Avatar
                  avatarPath={avatarPreviewUrl || profile?.avatar_path}
                  seed={profile?.id}
                  alt="Profile"
                  className="edit-avatar-preview-img"
                />
                <div className="edit-avatar-overlay">
                  <Camera size={26} weight="bold" />
                  <span>Change</span>
                </div>
              </div>

              <div className="edit-profile-user-summary">
                <h4 className="edit-profile-preview-name">{displayName}</h4>
                <p className="edit-profile-preview-username">{displayUsername}</p>
              </div>

              <button
                type="button"
                className="edit-avatar-change-btn loop-button loop-button--secondary"
                onClick={handleAvatarClick}
              >
                Change Photo
              </button>
            </div>

            {/* VERTICAL DIVIDER */}
            <div className="edit-profile-divider" />

            {/* RIGHT COLUMN: Form Inputs */}
            <div className="edit-profile-right-col">
              {/* Row 1: 2 fields (First Name, Last Name) */}
              <div className="edit-profile-row-2">
                <div className="edit-profile-field loop-form__field">
                  <label htmlFor="edit-first-name">First Name *</label>
                  <input
                    id="edit-first-name"
                    className="loop-form__control"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="First name"
                    required
                    maxLength={100}
                  />
                </div>
                <div className="edit-profile-field loop-form__field">
                  <label htmlFor="edit-last-name">Last Name *</label>
                  <input
                    id="edit-last-name"
                    className="loop-form__control"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Last name"
                    required
                    maxLength={100}
                  />
                </div>
              </div>

              {/* Row 2: 3 fields (Username/Nickname, Date of Birth, Privacy) */}
              <div className="edit-profile-row-3">
                <div className="edit-profile-field loop-form__field">
                  <label htmlFor="edit-nickname">Username</label>
                  <input
                    id="edit-nickname"
                    className="loop-form__control"
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="Nickname"
                    maxLength={40}
                  />
                </div>
                <div className="edit-profile-field loop-form__field">
                  <label htmlFor="edit-dob">Date of Birth *</label>
                  <input
                    id="edit-dob"
                    className="loop-form__control"
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    required
                  />
                </div>
                <div className="edit-profile-field loop-form__field">
                  <label htmlFor="edit-privacy">Privacy</label>
                  <div className="edit-profile-select-wrapper">
                    <select
                      id="edit-privacy"
                      value={privacy}
                      onChange={(e) => setPrivacy(Number(e.target.value))}
                      className="edit-profile-select loop-form__control"
                    >
                      <option value={PROFILE_PRIVACY.PUBLIC}>Public</option>
                      <option value={PROFILE_PRIVACY.PRIVATE}>Private</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Row 3: 1 wide field (About Me / Bio) */}
              <div className="edit-profile-row-1">
                <div className="edit-profile-field">
                  <div className="edit-profile-field-header">
                    <label htmlFor="edit-about-me">About Me / Bio</label>
                    <span className="edit-profile-char-count">
                      {aboutMe.length}/2000
                    </span>
                  </div>
                  <textarea
                    id="edit-about-me"
                    className="loop-form__control"
                    rows={4}
                    value={aboutMe}
                    onChange={(e) => setAboutMe(e.target.value)}
                    placeholder="Tell others about yourself..."
                    maxLength={2000}
                  />
                </div>
              </div>

              {/* Actions Footer */}
              <div className="edit-profile-actions">
                <button
                  type="button"
                  className="edit-profile-btn secondary loop-button loop-button--secondary"
                  onClick={onClose}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="edit-profile-btn primary loop-button loop-button--primary"
                  disabled={saving}
                >
                  <FloppyDisk size={18} weight="bold" />
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </form>

        {isCropperOpen && selectedImageSrc && (
          <AvatarCropperModal
            imageSrc={selectedImageSrc}
            onClose={() => {
              setIsCropperOpen(false);
              setSelectedImageSrc(null);
            }}
            onCropSave={handleCropSave}
          />
        )}
      </div>
    </div>
  );
}
