import { useSyncExternalStore } from "react";

const mobileQuery = "(width < 48rem)";

function subscribe(onChange: () => void) {
  const media = window.matchMedia(mobileQuery);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

function getSnapshot() {
  return window.matchMedia(mobileQuery).matches;
}

export function useIsMobile() {
  return useSyncExternalStore(subscribe, getSnapshot);
}
