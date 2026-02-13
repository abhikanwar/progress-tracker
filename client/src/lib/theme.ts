const THEME_KEY = "progress_tracker_theme";

type Theme = "light" | "dark";

const applyTheme = (theme: Theme) => {
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
};

export const themeManager = {
  init: () => {
    const stored = localStorage.getItem(THEME_KEY) as Theme | null;
    if (stored === "light" || stored === "dark") {
      applyTheme(stored);
      return stored;
    }
    const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
    const theme: Theme = prefersDark ? "dark" : "light";
    applyTheme(theme);
    return theme;
  },
  get: (): Theme => (document.documentElement.classList.contains("dark") ? "dark" : "light"),
  set: (theme: Theme) => {
    localStorage.setItem(THEME_KEY, theme);
    applyTheme(theme);
  },
  toggle: () => {
    const next: Theme = themeManager.get() === "dark" ? "light" : "dark";
    themeManager.set(next);
    return next;
  },
};

export type { Theme };
