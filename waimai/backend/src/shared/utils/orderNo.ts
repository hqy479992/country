export function createOrderNo() {
  const time = new Date()
    .toISOString()
    .replace(/[-:.TZ]/g, "")
    .slice(0, 14);
  const random = Math.floor(100000 + Math.random() * 900000);
  return `WM${time}${random}`;
}
