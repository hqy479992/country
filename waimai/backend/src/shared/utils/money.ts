export function formatCents(cents: number) {
  return Number((cents / 100).toFixed(2));
}

export function toCents(amount: number) {
  return Math.round(amount * 100);
}
