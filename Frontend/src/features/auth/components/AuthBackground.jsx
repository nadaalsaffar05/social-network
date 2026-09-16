import WebThreads from "../../../shared/components/web-threads/WebThreads.jsx";

const WEB_THREAD_PROPS = {
  color1: "#4F7DF3",
  color2: "#806BFF",
  color3: "#B8C8FF",
  speed: 0.08,
  threadCount: 5,
  frequency: 5,
  spread: 0.2,
  taper: 1,
  position: 0.5,
  fanMode: "center",
  glow: 0.035,
  falloff: 0.65,
  thickness: 1,
  brightness: 0.4,
  opacity: 0.55,
  mirror: true,
  shimmer: false,
  grain: true,
  grainIntensity: 0.03,
  mouseInteraction: true,
  mouseStrength: 0.15,
};

export default function AuthBackground() {
  return (
    <div className="auth-background" aria-hidden="true">
      <WebThreads {...WEB_THREAD_PROPS} />
    </div>
  );
}
