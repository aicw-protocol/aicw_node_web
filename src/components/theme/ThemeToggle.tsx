"use client";

import { useTheme } from "./ThemeProvider";

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export function ThemeToggle({ className = "", showLabel = true }: ThemeToggleProps) {
  const { theme, toggleTheme, mounted } = useTheme();

  const label = theme === "dark" ? "Light mode" : "Dark mode";
  const icon = theme === "dark" ? "fa-sun" : "fa-moon";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-content-secondary transition hover:bg-surface hover:text-content-primary ${className}`}
      aria-label={label}
      title={label}
      disabled={!mounted}
    >
      <i className={`fa-solid ${mounted ? icon : "fa-circle-half-stroke"} w-4 text-center`} aria-hidden />
      {showLabel ? <span>{label}</span> : null}
    </button>
  );
}
