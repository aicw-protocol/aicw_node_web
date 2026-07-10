const STORAGE_KEY = "aicw-last-node-name";

export function saveLastNodeName(nodeName: string): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, nodeName.trim());
  } catch {
    // ignore private browsing / storage disabled
  }
}

export function readLastNodeName(): string | null {
  try {
    return sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}
