export const COLLECTION_COLORS = [
  "#d97706", "#0ea5e9", "#8b5cf6", "#10b981", "#ef4444", "#f59e0b",
];

export function pickNextCollectionColor(existing: { color: string }[]): string {
  const used = new Set(existing.map((c) => c.color));
  const free = COLLECTION_COLORS.find((c) => !used.has(c));
  if (free) return free;
  // All colors taken: cycle by count
  return COLLECTION_COLORS[existing.length % COLLECTION_COLORS.length];
}
