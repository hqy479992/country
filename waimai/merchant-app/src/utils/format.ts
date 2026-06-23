export function yuan(cents: number) {
  return `¥${(cents / 100).toFixed(2)}`;
}

export function yuanToCents(value: string | number) {
  return Math.round(Number(value || 0) * 100);
}

export function centsToYuan(cents: number) {
  return (cents / 100).toFixed(2);
}

export function statusText(status: string) {
  const map: Record<string, string> = {
    PENDING_PAYMENT: "待支付",
    PAID: "待接单",
    MERCHANT_ACCEPTED: "已接单",
    READY_FOR_PICKUP: "已出餐",
    RIDER_ACCEPTED: "骑手已接单",
    PICKED_UP: "配送中",
    DELIVERED: "已送达",
    COMPLETED: "已完成",
    CANCELLED: "已取消"
  };
  return map[status] ?? status;
}

export function canAccept(status: string) {
  return status === "PAID";
}

export function canReady(status: string) {
  return status === "MERCHANT_ACCEPTED";
}
