// Display helpers. Prices are stored as integer cents per CLAUDE.md;
// always format from cents to avoid float drift.

export function formatPrice(cents: number, currency = "CAD"): string {
  const dollars = cents / 100;
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency,
  }).format(dollars);
}

export function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const seconds = Math.round((now - then) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.round(months / 12)}y ago`;
}

export function formatSize(
  value: number | null,
  unit: string | null,
): string | null {
  if (value == null || !unit) return null;
  // Trim ".0" off integer-valued floats.
  const v = value % 1 === 0 ? value.toString() : value.toFixed(2);
  return `${v} ${unit}`;
}
