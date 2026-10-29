import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { ThemeContext } from "./theme-context";
import { readThemePreference, saveThemePreference, watchTheme, type ThemePreference } from "./theme";

function browserStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setCurrentTheme] = useState<ThemePreference>(() => readThemePreference(browserStorage()));

  useEffect(() => {
    if (typeof window.matchMedia !== "function") {
      document.documentElement.classList.toggle("dark", theme === "dark");
      return;
    }
    return watchTheme(theme, document.documentElement, window.matchMedia("(prefers-color-scheme: dark)"));
  }, [theme]);

  const setTheme = useCallback((next: ThemePreference) => {
    saveThemePreference(browserStorage(), next);
    setCurrentTheme(next);
  }, []);
  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
