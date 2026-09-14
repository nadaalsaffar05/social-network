import { useState, useRef } from 'react'
import { X, FloppyDisk, LockKey, Globe, NotePencil, Camera } from '@phosphor-icons/react'
import { updateProfile, uploadAvatar } from '../../api/profile.js'
import AvatarCropperModal from '../../shared/components/avatar-cropper/AvatarCropperModal'
import Avatar from '../../shared/components/avatar/Avatar.jsx'
import './EditProfileModal.css'

export default function EditProfileModal({ profile, onClose, onSave }) {
  const [firstName, setFirstName] = useState(profile?.first_name || '')
  const [lastName, setLastName] = useState(profile?.last_name || '')
  const [nickname, setNickname] = useState(profile?.nickname || '')
  const [aboutMe, setAboutMe] = useState(profile?.about_me || '')
  const [dateOfBirth, setDateOfBirth] = useState(
    profile?.date_of_birth ? profile.date_of_birth.split('T')[0] : ''
  )
  const [privacy, setPrivacy] = useState(profile?.privacy ?? 1000)

  // Avatar state
  const [newAvatarFile, setNewAvatarFile] = useState(null)
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState(null)
  const [selectedImageSrc, setSelectedImageSrc] = useState(null)
  const [isCropperOpen, setIsCropperOpen] = useState(false)
  const fileInputRef = useRef(null)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function handleAvatarClick() {
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
      fileInputRef.current.click()
    }
  }

  function handleFileSelect(e) {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]
      const reader = new FileReader()
      reader.addEventListener('load', () => {
        setSelectedImageSrc(reader.result)
        setIsCropperOpen(true)
      })
      reader.readAsDataURL(file)
    }
  }

  function handleCropSave(croppedFile) {
    setNewAvatarFile(croppedFile)
    setAvatarPreviewUrl(URL.createObjectURL(croppedFile))
    setIsCropperOpen(false)
    setSelectedImageSrc(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!firstName.trim()) {
      setError('First name is required')
      return
    }
    if (!lastName.trim()) {
      setError('Last name is required')
      return
    }
    if (!dateOfBirth) {
      setError('Date of birth is required')
      return
    }

    try {
      setSaving(true)

      let updatedAvatarPath = null
      if (newAvatarFile) {
        const avatarRes = await uploadAvatar(newAvatarFile)
        updatedAvatarPath = avatarRes.avatar_path
      }

      const updatedUser = await updateProfile({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        nickname: nickname.trim() || null,
        about_me: aboutMe.trim() || null,
        date_of_birth: dateOfBirth,
        privacy: Number(privacy),
      })

      if (updatedAvatarPath) {
        updatedUser.avatar_path = updatedAvatarPath
      }

      onSave(updatedUser)
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to update profile — please try again')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="edit-profile-modal-backdrop" onClick={onClose}>
      <div className="edit-profile-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="edit-profile-modal-header">
          <div className="edit-profile-modal-title">
            <NotePencil size={22} weight="bold" className="edit-profile-icon-title" />
            <h3>Edit Profile</h3>
          </div>
          <button type="button" className="edit-profile-close-btn" onClick={onClose} aria-label="Close">
            <X size={20} weight="bold" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="edit-profile-form">
          {error && <div className="edit-profile-error">{error}</div>}

          {/* Avatar Edit Section */}
          <div className="edit-avatar-section">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/jpeg,image/png,image/gif"
              style={{ display: 'none' }}
            />
            <div className="edit-avatar-preview-wrapper" onClick={handleAvatarClick} title="Change Profile Picture">
              <Avatar
                avatarPath={avatarPreviewUrl || profile?.avatar_path}
                seed={profile?.id}
                alt="Profile"
                className="edit-avatar-preview-img"
              />
              <div className="edit-avatar-overlay">
                <Camera size={22} weight="bold" />
                <span>Change</span>
              </div>
            </div>
            <button type="button" className="edit-avatar-change-btn" onClick={handleAvatarClick}>
              Change Profile Photo
            </button>
          </div>

          <div className="edit-profile-row">
            <div className="edit-profile-field">
              <label htmlFor="edit-first-name">First Name *</label>
              <input
                id="edit-first-name"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First name"
                required
                maxLength={100}
              />
            </div>
            <div className="edit-profile-field">
              <label htmlFor="edit-last-name">Last Name *</label>
              <input
                id="edit-last-name"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last name"
                required
                maxLength={100}
              />
            </div>
          </div>

          <div className="edit-profile-row">
            <div className="edit-profile-field">
              <label htmlFor="edit-nickname">Username / Nickname</label>
              <input
                id="edit-nickname"
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="e.g. john_doe"
                maxLength={40}
              />
            </div>
            <div className="edit-profile-field">
              <label htmlFor="edit-dob">Date of Birth *</label>
              <input
                id="edit-dob"
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="edit-profile-field">
            <label>Account Privacy</label>
            <div className="edit-profile-privacy-options">
              <label className={`privacy-option ${privacy === 1000 ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="privacy"
                  value={1000}
                  checked={privacy === 1000}
                  onChange={() => setPrivacy(1000)}
                />
                <Globe size={18} weight="bold" />
                <div className="privacy-option-text">
                  <span className="privacy-option-title">Public</span>
                  <span className="privacy-option-sub">Anyone can view your posts & profile</span>
                </div>
              </label>

              <label className={`privacy-option ${privacy === 1010 ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="privacy"
                  value={1010}
                  checked={privacy === 1010}
                  onChange={() => setPrivacy(1010)}
                />
                <LockKey size={18} weight="bold" />
                <div className="privacy-option-text">
                  <span className="privacy-option-title">Private</span>
                  <span className="privacy-option-sub">Only approved followers can view your posts</span>
                </div>
              </label>
            </div>
          </div>

          <div className="edit-profile-field">
            <label htmlFor="edit-about-me">About Me / Bio</label>
            <textarea
              id="edit-about-me"
              rows={3}
              value={aboutMe}
              onChange={(e) => setAboutMe(e.target.value)}
              placeholder="Tell others about yourself"
              maxLength={2000}
            />
            <span className="edit-profile-char-count">{aboutMe.length}/2000</span>
          </div>

          <div className="edit-profile-actions">
            <button
              type="button"
              className="edit-profile-btn secondary"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="edit-profile-btn primary"
              disabled={saving}
            >
              <FloppyDisk size={18} weight="bold" />
              {saving ? 'Saving' : 'Save Changes'}
            </button>
          </div>
        </form>

        {isCropperOpen && selectedImageSrc && (
          <AvatarCropperModal
            imageSrc={selectedImageSrc}
            onClose={() => {
              setIsCropperOpen(false)
              setSelectedImageSrc(null)
            }}
            onCropSave={handleCropSave}
          />
        )}
      </div>
    </div>
  )
}
