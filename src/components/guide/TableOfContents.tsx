"use client";

import { useEffect, useRef, useState } from "react";
import { findScrollContainer, scrollToSection } from "@/lib/scrollToSection";

export interface TocItem {
  id: string;
  label: string;
}

export const GUIDE_TOC_ITEMS: TocItem[] = [
  { id: "overview", label: "Overview — What is a node?" },
  { id: "requirements", label: "Requirements" },
  { id: "quick-start", label: "Quick Start (5 minutes)" },
  { id: "detailed-steps", label: "Detailed Steps" },
  { id: "troubleshooting", label: "Troubleshooting" },
  { id: "faq", label: "FAQ" },
];

export function TableOfContents() {
  const navRef = useRef<HTMLElement>(null);
  const [activeId, setActiveId] = useState<string>("");

  useEffect(() => {
    const sections = GUIDE_TOC_ITEMS.map((item) =>
      document.getElementById(item.id),
    ).filter(Boolean) as HTMLElement[];

    if (sections.length === 0) return;

    const scrollContainer =
      findScrollContainer(sections[0]) ??
      findScrollContainer(navRef.current ?? sections[0]);

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries.filter((entry) => entry.isIntersecting);
        if (visibleEntries.length === 0) return;

        const topEntry = visibleEntries.reduce((prev, curr) =>
          prev.boundingClientRect.top < curr.boundingClientRect.top ? prev : curr,
        );
        setActiveId(topEntry.target.id);
      },
      {
        root: scrollContainer,
        rootMargin: "-24px 0px -60% 0px",
        threshold: 0,
      },
    );

    sections.forEach((section) => observer.observe(section));

    const hash = window.location.hash.replace("#", "");
    if (hash && GUIDE_TOC_ITEMS.some((item) => item.id === hash)) {
      requestAnimationFrame(() => scrollToSection(hash));
      setActiveId(hash);
    }

    return () => {
      sections.forEach((section) => observer.unobserve(section));
    };
  }, []);

  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    event.preventDefault();
    if (scrollToSection(id)) {
      setActiveId(id);
    }
  };

  return (
    <nav ref={navRef} aria-label="Guide sections" className="sticky top-6">
      <h2 className="text-sm font-medium text-content-secondary">On this page</h2>
      <ul className="mt-3 space-y-2 text-sm">
        {GUIDE_TOC_ITEMS.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              onClick={(event) => handleClick(event, item.id)}
              className={`block border-l-2 pl-3 transition-colors ${
                activeId === item.id
                  ? "border-accent text-accent"
                  : "border-transparent text-content-muted hover:border-surface-border hover:text-content-secondary"
              }`}
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
