"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { WalletButton } from "@/components/WalletButton";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

const NAV_ITEMS = [
  { href: "/nodes", label: "Nodes", icon: "fa-globe" },
  { href: "/dashboard", label: "Dashboard", icon: "fa-gauge-high" },
  { href: "/staking", label: "Staking", icon: "fa-coins" },
  { href: "/node-rewards", label: "Node Rewards", icon: "fa-gift" },
  { href: "/guide", label: "Guide", icon: "fa-book" },
] as const;

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarNav({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-col gap-0.5 px-2" aria-label="Main navigation">
      {NAV_ITEMS.map(({ href, label, icon }) => {
        const active = isActivePath(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
              active
                ? "bg-surface text-content-primary"
                : "text-content-secondary hover:bg-surface hover:text-content-primary"
            }`}
            aria-current={active ? "page" : undefined}
          >
            <i className={`fa-solid ${icon} w-4 text-center text-[0.9rem]`} aria-hidden />
            <span className="truncate">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!sidebarOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSidebarOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [sidebarOpen]);

  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-surface text-content-primary">
      {sidebarOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          aria-label="Close navigation menu"
          onClick={closeSidebar}
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(100vw-3rem,17.5rem)] flex-col border-r border-surface-border bg-surface-panel transition-transform duration-200 ease-out lg:static lg:z-auto lg:w-[17.5rem] lg:shrink-0 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
        aria-label="Sidebar"
      >
        <div className="flex items-center justify-between gap-2 border-b border-surface-border px-4 py-4">
          <Link
            href="/nodes"
            className="font-logo text-lg font-semibold tracking-tight text-content-primary"
            onClick={closeSidebar}
          >
            AICW<span className="text-accent"> Node</span>
          </Link>
          <button
            type="button"
            className="rounded-lg p-2 text-content-secondary hover:bg-surface hover:text-content-primary lg:hidden"
            aria-label="Close navigation menu"
            onClick={closeSidebar}
          >
            <i className="fa-solid fa-xmark" aria-hidden />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-3">
          <SidebarNav pathname={pathname} onNavigate={closeSidebar} />
        </div>

        <div className="space-y-2 border-t border-surface-border p-3">
          <ThemeToggle />
          <div className="hidden lg:block">
            <WalletButton layout="sidebar" />
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 items-center gap-3 border-b border-surface-border bg-surface-panel/80 px-4 py-3 backdrop-blur-md lg:hidden">
          <button
            type="button"
            className="rounded-lg p-2 text-content-secondary hover:bg-surface hover:text-content-primary"
            aria-expanded={sidebarOpen}
            aria-label={sidebarOpen ? "Close navigation menu" : "Open navigation menu"}
            onClick={() => setSidebarOpen((open) => !open)}
          >
            <i className={`fa-solid ${sidebarOpen ? "fa-xmark" : "fa-bars"}`} aria-hidden />
          </button>
          <Link href="/nodes" className="min-w-0 truncate font-logo text-base font-semibold text-content-primary">
            AICW<span className="text-accent"> Node</span>
          </Link>
          <div className="ml-auto shrink-0">
            <WalletButton layout="compact" />
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
