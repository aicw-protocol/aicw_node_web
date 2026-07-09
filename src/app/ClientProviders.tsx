"use client";

import { Toaster } from "react-hot-toast";
import { SolanaProviders } from "@/components/SolanaProviders";
import { ThemeProvider, useTheme } from "@/components/theme/ThemeProvider";

function ThemedToaster() {
  const { theme } = useTheme();

  return (
    <Toaster
      position="top-right"
      toastOptions={{
        style: {
          background: "var(--color-toast-bg)",
          color: "var(--color-toast-text)",
          border: "1px solid var(--color-toast-border)",
        },
        success: {
          iconTheme: {
            primary: "var(--color-accent)",
            secondary: theme === "dark" ? "#2f2f2f" : "#ffffff",
          },
        },
        error: {
          iconTheme: {
            primary: "#f87171",
            secondary: theme === "dark" ? "#2f2f2f" : "#ffffff",
          },
        },
      }}
    />
  );
}

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <SolanaProviders>
        {children}
        <ThemedToaster />
      </SolanaProviders>
    </ThemeProvider>
  );
}
