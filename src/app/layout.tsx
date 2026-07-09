import "./globals.css";
import "@fortawesome/fontawesome-free/css/all.min.css";
import type { Metadata } from "next";
import { ClientProviders } from "./ClientProviders";

export const metadata: Metadata = {
  metadataBase: new URL("https://node.aicw.ai"),
  title: "AICW Node — Dashboard & Staking",
  description:
    "Monitor the global AICW node network, stake SOL, and operate your MPC node.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("aicw-theme");var d=t==="dark"||(!t&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.add(d?"dark":"light");}catch(e){document.documentElement.classList.add("dark");}})();`,
          }}
        />
      </head>
      <body>
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}