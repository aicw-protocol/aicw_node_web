const SCROLL_OFFSET = 24;

/** Find the nearest scrollable ancestor (AppShell uses overflow-y-auto on main). */
export function findScrollContainer(element: HTMLElement): HTMLElement | null {
  let parent = element.parentElement;

  while (parent) {
    const { overflowY } = getComputedStyle(parent);
    if (overflowY === "auto" || overflowY === "scroll") {
      return parent;
    }
    parent = parent.parentElement;
  }

  return null;
}

export function scrollToSection(id: string, offset = SCROLL_OFFSET): boolean {
  const element = document.getElementById(id);
  if (!element) return false;

  const scrollContainer = findScrollContainer(element);

  if (scrollContainer) {
    const containerTop = scrollContainer.getBoundingClientRect().top;
    const elementTop = element.getBoundingClientRect().top;
    const top =
      scrollContainer.scrollTop + (elementTop - containerTop) - offset;

    scrollContainer.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  } else {
    const top = element.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  }

  if (window.history.replaceState) {
    window.history.replaceState(null, "", `#${id}`);
  } else {
    window.location.hash = id;
  }

  return true;
}
