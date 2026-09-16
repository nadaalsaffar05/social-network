import { ArrowLeft } from "@phosphor-icons/react";
import { usePageBack } from "./usePageBack.js";

export default function BackButton({
  className,
  fallback = "/home",
  label,
  preferFallback = false,
  size = 22,
}) {
  const goBack = usePageBack(fallback, { preferFallback });

  return (
    <button
      type="button"
      className={className}
      aria-label={label || "Go back"}
      onClick={goBack}
    >
      <ArrowLeft size={size} />
      {label && <span>{label}</span>}
    </button>
  );
}
