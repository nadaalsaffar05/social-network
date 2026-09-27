import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  X,
  CaretLeft,
  CaretRight,
  MagnifyingGlassPlus,
  MagnifyingGlassMinus,
} from "@phosphor-icons/react";
import "./ImageModal.css";

export default function ImageModal({ images = [], initialIndex = 0, onClose }) {
  const imageList = Array.isArray(images) ? images : [images];
  const [currentIndex, setCurrentIndex] = useState(
    initialIndex >= 0 && initialIndex < imageList.length ? initialIndex : 0,
  );
  const [isZoomed, setIsZoomed] = useState(false);

  const handlePrev = useCallback(
    (event) => {
      if (event) event.stopPropagation();
      setIsZoomed(false);
      setCurrentIndex((prev) => (prev > 0 ? prev - 1 : imageList.length - 1));
    },
    [imageList.length],
  );

  const handleNext = useCallback(
    (event) => {
      if (event) event.stopPropagation();
      setIsZoomed(false);
      setCurrentIndex((prev) => (prev < imageList.length - 1 ? prev + 1 : 0));
    },
    [imageList.length],
  );

  const toggleZoom = useCallback((event) => {
    if (event) event.stopPropagation();
    setIsZoomed((prev) => !prev);
  }, []);

  const handleClose = useCallback(
    (event) => {
      if (event) event.stopPropagation();
      onClose?.();
    },
    [onClose],
  );

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose?.();
      } else if (event.key === "ArrowLeft" && imageList.length > 1) {
        handlePrev();
      } else if (event.key === "ArrowRight" && imageList.length > 1) {
        handleNext();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [imageList.length, handlePrev, handleNext, onClose]);

  if (!imageList.length) return null;

  const currentSrc = imageList[currentIndex];

  return createPortal(
    <div
      className="fullscreen-image-modal__backdrop"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-label="Image viewer full screen"
    >
      <div className="fullscreen-image-modal__header">
        {imageList.length > 1 ? (
          <span
            className="fullscreen-image-modal__counter"
            onClick={(event) => event.stopPropagation()}
          >
            {currentIndex + 1} / {imageList.length}
          </span>
        ) : (
          <span />
        )}
        <div
          className="fullscreen-image-modal__actions"
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            className="fullscreen-image-modal__btn"
            onClick={toggleZoom}
            aria-label={isZoomed ? "Zoom out" : "Zoom in"}
            title={isZoomed ? "Zoom out" : "Zoom in"}
          >
            {isZoomed ? (
              <MagnifyingGlassMinus size={22} />
            ) : (
              <MagnifyingGlassPlus size={22} />
            )}
          </button>
          <button
            type="button"
            className="fullscreen-image-modal__btn fullscreen-image-modal__btn--close"
            onClick={handleClose}
            aria-label="Close modal"
            title="Close (Esc)"
          >
            <X size={24} weight="bold" />
          </button>
        </div>
      </div>

      <div
        className={`fullscreen-image-modal__content${
          isZoomed ? " fullscreen-image-modal__content--zoomed" : ""
        }`}
        onClick={handleClose}
      >
        {imageList.length > 1 && (
          <button
            type="button"
            className="fullscreen-image-modal__nav fullscreen-image-modal__nav--prev"
            onClick={handlePrev}
            aria-label="Previous image"
          >
            <CaretLeft size={32} weight="bold" />
          </button>
        )}

        <img
          src={currentSrc}
          alt={`Full screen post image ${currentIndex + 1}`}
          className={`fullscreen-image-modal__img${
            isZoomed ? " fullscreen-image-modal__img--zoomed" : ""
          }`}
          onClick={(event) => {
            event.stopPropagation();
            toggleZoom();
          }}
        />

        {imageList.length > 1 && (
          <button
            type="button"
            className="fullscreen-image-modal__nav fullscreen-image-modal__nav--next"
            onClick={handleNext}
            aria-label="Next image"
          >
            <CaretRight size={32} weight="bold" />
          </button>
        )}
      </div>
    </div>,
    document.body,
  );
}
