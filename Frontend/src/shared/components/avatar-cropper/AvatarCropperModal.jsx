import { useState, useCallback } from "react";
import { createPortal } from "react-dom";
import Cropper from "react-easy-crop";
import {
  X,
  MagnifyingGlassMinus,
  MagnifyingGlassPlus,
  Check,
} from "@phosphor-icons/react";
import { getCroppedImg } from "../../utils/cropImage";
import { useToast } from "../toast/useToast.js";
import "./AvatarCropperModal.css";

export default function AvatarCropperModal({ imageSrc, onClose, onCropSave }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const { error: showError } = useToast();

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSave = async () => {
    if (!croppedAreaPixels) return;
    try {
      setIsSaving(true);
      const croppedFile = await getCroppedImg(imageSrc, croppedAreaPixels);
      await onCropSave(croppedFile);
    } catch (cropError) {
      showError("Couldn’t crop photo", cropError.message || "Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return createPortal(
    <div className="cropper-modal-backdrop loop-glass-backdrop" onClick={onClose}>
      <div className="cropper-modal-card loop-glass-surface" onClick={(e) => e.stopPropagation()}>
        <div className="cropper-modal-header">
          <h3 className="cropper-modal-title">Crop Profile Picture</h3>
          <button
            type="button"
            className="cropper-close-btn loop-icon-button"
            onClick={onClose}
            aria-label="Close"
          >
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
              className="cropper-btn secondary loop-button loop-button--secondary"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              type="button"
              className="cropper-btn primary loop-button loop-button--primary"
              onClick={handleSave}
              disabled={isSaving}
            >
              <Check size={18} weight="bold" />
              {isSaving ? "Saving" : "Save Avatar"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
