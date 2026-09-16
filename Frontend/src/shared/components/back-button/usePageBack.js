import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export function routePath(location) {
  return `${location.pathname}${location.search}${location.hash}`;
}

function isInternalRoute(path) {
  return typeof path === "string" && path.startsWith("/");
}

export function usePageNavigate() {
  const location = useLocation();
  const navigate = useNavigate();

  return useCallback(
    (to, options = {}) => {
      const { state, ...navigationOptions } = options;
      navigate(to, {
        ...navigationOptions,
        state: { ...state, from: routePath(location) },
      });
    },
    [location, navigate],
  );
}

export function usePageBack(
  fallback = "/home",
  { preferFallback = false } = {},
) {
  const location = useLocation();
  const navigate = useNavigate();

  return useCallback(() => {
    const currentPath = routePath(location);
    const origin = location.state?.from;
    const target =
      !preferFallback && isInternalRoute(origin) && origin !== currentPath
        ? origin
        : fallback;

    navigate(target, { replace: true });
  }, [fallback, location, navigate, preferFallback]);
}
