import { useEffect, useState } from "react";

const MOBILE_REGEX =
  /Android|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i;

const TABLET_REGEX =
  /iPad|Android.*Tablet|Kindle|Silk/i;

const isIPadSafari = () =>
  /Macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1;

const BREAKPOINTS = {
  MOBILE_MAX: 767,
  TABLET_MAX: 1024,
};

function detectDeviceType() {
  const ua = navigator.userAgent;

  if (isIPadSafari()) return "tablet";
  if (TABLET_REGEX.test(ua)) return "tablet";
  if (MOBILE_REGEX.test(ua)) return "mobile";

  const width = window.innerWidth;
  if (width <= BREAKPOINTS.MOBILE_MAX) return "mobile";
  if (width <= BREAKPOINTS.TABLET_MAX) return "tablet";

  return "desktop";
}

export function useDevice() {
  const [deviceType, setDeviceType] = useState(detectDeviceType);

  useEffect(() => {
    function handleResize() {
      const next = detectDeviceType();
      setDeviceType((prev) => (prev !== next ? next : prev));
    }

    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return {
    deviceType,
    isMobile: deviceType === "mobile",
    isTablet: deviceType === "tablet",
    isDesktop: deviceType === "desktop",
  };
}
