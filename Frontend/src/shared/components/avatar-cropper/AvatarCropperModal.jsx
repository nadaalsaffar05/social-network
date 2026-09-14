import { useState, useCallback } from 'react'
import Cropper from 'react-easy-crop'
import { X, MagnifyingGlassMinus, MagnifyingGlassPlus, Check } from '@phosphor-icons/react'
import { getCroppedImg } from '../../utils/crop-image'
import './AvatarCropperModal.css'

export default function AvatarCropperModal({ imageSrc, onClose, onCropSave }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)
  const [isSaving, setIsSaving] = useState(false)

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  const handleSave = async () => {
    if (!croppedAreaPixels) return
    try {
      setIsSaving(true)
      const croppedFile = await getCroppedImg(imageSrc, croppedAreaPixels)
      await onCropSave(croppedFile)
    } catch (error) {
      console.error('Error cropping avatar:', error)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="cropper-modal-backdrop" onClick={onClose}>
      <div className="cropper-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="cropper-modal-header">
          <h3 className="cropper-modal-title">Crop Profile Picture</h3>
          <button type="button" className="cropper-close-btn" onClick={onClose} aria-label="Close">
            <X size={20} weight="bold" />
          </button>
        </div>

        <div className="cropper-container-wrapper">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onCropComplete={onCropComplete}
            onZoomChange={setZoom}
          />
        </div>

        <div className="cropper-controls">
          <div className="cropper-zoom-slider-container">
            <MagnifyingGlassMinus size={20} weight="bold" />
            <input
              type="range"
              value={zoom}
              min={1}
              max={3}
              step={0.1}
              aria-label="Zoom"
              onChange={(e) => setZoom(Number(e.target.value))}
              className="cropper-zoom-range"
            />
            <MagnifyingGlassPlus size={20} weight="bold" />
          </div>

          <div className="cropper-action-buttons">
            <button
              type="button"
              className="cropper-btn secondary"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="button"
              className="cropper-btn primary"
              onClick={handleSave}
              disabled={isSaving}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Check size={18} weight="bold" />
              {isSaving ? 'Saving' : 'Save Avatar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

