export type ThemePreference = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "mediflow-theme";

export function readThemePreference(storage: Pick<Storage, "getItem"> | null): ThemePreference {
  try {
    const value = storage?.getItem(THEME_STORAGE_KEY);
    return value === "light" || value === "dark" || value === "system" ? value : "light";
  } catch {
    return "light";
  }
}

export function saveThemePreference(
  storage: Pick<Storage, "setItem"> | null,
  preference: ThemePreference,
): void {
  try {
    storage?.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Theme selection still works for the current page when storage is unavailable.
  }
}

export function watchTheme(
  preference: ThemePreference,
  root: Pick<HTMLElement, "classList">,
  media: Pick<MediaQueryList, "matches" | "addEventListener" | "removeEventListener">,
): () => void {
  const apply = () => {
    const dark = preference === "dark" || (preference === "system" && media.matches);
    root.classList.toggle("dark", dark);
  };

  apply();
  if (preference !== "system") return () => {};

  media.addEventListener("change", apply);
  return () => media.removeEventListener("change", apply);
}
