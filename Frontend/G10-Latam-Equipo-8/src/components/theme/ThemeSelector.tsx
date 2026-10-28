import type { ThemePreference } from "@/theme/theme";

const choices: { value: ThemePreference; label: string }[] = [
  { value: "light", label: "Claro" },
  { value: "dark", label: "Oscuro" },
  { value: "system", label: "Sistema" },
];

const indicatorPosition: Record<ThemePreference, string> = {
  light: "translate-x-0",
  dark: "translate-x-full",
  system: "translate-x-[200%]",
};

export function ThemeSelector({
  theme,
  onThemeChange,
}: {
  theme: ThemePreference;
  onThemeChange: (theme: ThemePreference) => void;
}) {
  return (
    <fieldset className="relative grid w-52 shrink-0 grid-cols-3 rounded-lg border border-border bg-muted p-1">
      <legend className="sr-only">Tema de apariencia</legend>
      <span aria-hidden="true" className="pointer-events-none absolute inset-1 grid grid-cols-3">
        <span
          className={`rounded-md bg-background shadow-sm transition-transform motion-reduce:transition-none ${indicatorPosition[theme]}`}
        />
      </span>
      {choices.map(({ value, label }) => (
        <label key={value} className="relative cursor-pointer">
          <input
            type="radio"
            name="theme"
            value={value}
            checked={theme === value}
            onChange={() => onThemeChange(value)}
            className="peer sr-only"
          />
          <span
            className={`relative grid min-h-9 place-items-center rounded-md px-1 text-xs peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring dark:peer-focus-visible:outline-teal-300 ${
              theme === value ? "font-semibold text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </span>
        </label>
      ))}
    </fieldset>
  );
}
