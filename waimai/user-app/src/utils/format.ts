export function yuan(cents: number) {
  return `¥${(cents / 100).toFixed(2)}`;
}

export function statusText(status: string) {
  const map: Record<string, string> = {
    PENDING_PAYMENT: "待支付",
    PAID: "待商家接单",
    MERCHANT_ACCEPTED: "商家已接单",
    READY_FOR_PICKUP: "待骑手取货",
    RIDER_ACCEPTED: "骑手取餐中",
    PICKED_UP: "配送中",
    PENDING_ASSIGN: "待骑手接单",
    DELIVERED: "已送达",
    COMPLETED: "已完成",
    CANCELLED: "已取消",
  };
  return map[status] ?? status;
}

export function orderStage(status: string) {
  if (status === "PENDING_PAYMENT") return "待支付";
  if (["PAID", "MERCHANT_ACCEPTED", "READY_FOR_PICKUP"].includes(status))
    return "商家处理中";
  if (["RIDER_ACCEPTED", "PICKED_UP"].includes(status)) return "配送中";
  if (["DELIVERED", "COMPLETED"].includes(status)) return "已完成";
  if (status === "CANCELLED") return "已取消";
  return statusText(status);
}

export function statusClass(status: string) {
  if (status === "PENDING_PAYMENT") return "paying";
  if (status === "CANCELLED") return "cancelled";
  if (["DELIVERED", "COMPLETED"].includes(status)) return "done";
  return "active";
}

export function dateText(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
export function paymentRemaining(
  expiresAt: string | null | undefined,
  now: number,
) {
  if (!expiresAt) return "";
  const seconds = Math.max(0, Math.ceil((Date.parse(expiresAt) - now) / 1000));
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}
export function orderDescription(status: string) {
  const descriptions: Record<string, string> = {
    PENDING_PAYMENT: "支付完成后，商家才能开始备餐",
    PAID: "商家确认后将更新备餐状态",
    MERCHANT_ACCEPTED: "商家正在为你准备餐品",
    READY_FOR_PICKUP: "餐品已备好，等待骑手取餐",
    RIDER_ACCEPTED: "骑手已接单，正在前往商家取餐",
    PICKED_UP: "骑手已取餐，正在送往收货地址",
    DELIVERED: "餐品已送达，祝你用餐愉快",
    COMPLETED: "订单已完成，感谢你的支持",
    CANCELLED: "订单已关闭，未支付订单不会扣款",
  };
  return descriptions[status] || "请以最新订单状态为准";
}
