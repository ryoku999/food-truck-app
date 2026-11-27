import type { Theme } from "./theme-context";

const storageKey = "vite-ui-theme";

function isTheme(value: string | null): value is Theme {
  return value === "light" || value === "dark";
}

export function getInitialTheme(): Theme {
  const system = window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";

  try {
    const saved = localStorage.getItem(storageKey);
    if (isTheme(saved)) return saved;
    if (saved !== "system") {
      const previous = localStorage.getItem("app-theme");
      if (isTheme(previous)) return previous;
    }
  } catch {
    // The browser preference is still available when storage is blocked.
  }
  return system;
}

export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.classList.toggle("light", theme === "light");
}

export function saveTheme(theme: Theme) {
  try {
    localStorage.setItem(storageKey, theme);
  } catch {
    // The selection still applies to the current page.
  }
}
