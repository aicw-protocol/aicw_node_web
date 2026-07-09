import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        surface: {
          DEFAULT: "var(--color-surface)",
          panel: "var(--color-surface-panel)",
          elevated: "var(--color-surface-elevated)",
          border: "var(--color-surface-border)",
        },
        content: {
          primary: "var(--color-content-primary)",
          secondary: "var(--color-content-secondary)",
          muted: "var(--color-content-muted)",
        },
        accent: {
          DEFAULT: "var(--color-accent)",
          muted: "var(--color-accent-muted)",
        },
      },
      fontFamily: {
        logo: ["var(--font-logo)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      maxWidth: {
        page: "56rem",
      },
    },
  },
  plugins: [],
};

export default config;
