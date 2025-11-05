export function computeCountdownDays(deadlineISO: string, now: Date = new Date()): number {
  const d = new Date(deadlineISO).getTime();
  const n = now.getTime();
  const diff = Math.max(0, d - n);
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}