/** Normalize release tags like v0.1.28 or 0.1.27-gui to 0.1.28. */
export function normalizeVersion(input: string): string {
  return input.trim().replace(/^v/i, "").replace(/-gui$/i, "");
}

/** Semver-ish compare: negative if a < b, positive if a > b, 0 if equal. */
export function compareVersions(a: string, b: string): number {
  const parse = (value: string) =>
    normalizeVersion(value)
      .split(".")
      .map((part) => Number.parseInt(part, 10))
      .map((part) => (Number.isFinite(part) ? part : 0));

  const left = parse(a);
  const right = parse(b);
  const length = Math.max(left.length, right.length);

  for (let index = 0; index < length; index += 1) {
    const delta = (left[index] ?? 0) - (right[index] ?? 0);
    if (delta !== 0) return delta;
  }

  return 0;
}

export function isVersionNewer(candidate: string, baseline: string): boolean {
  return compareVersions(candidate, baseline) > 0;
}
