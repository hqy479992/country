export function yuan(cents: number) {
  return `¥${(cents / 100).toFixed(2)}`;
}

export function statusText(status: string) {
  const map: Record<string, string> = {
    PENDING_PAYMENT: "待支付",
    PAID: "已支付",
    MERCHANT_ACCEPTED: "商家已接单",
    READY_FOR_PICKUP: "待骑手取货",
    RIDER_ACCEPTED: "骑手已接单",
    PICKED_UP: "配送中",
    PENDING_ASSIGN: "待骑手接单",
    DELIVERED: "已送达",
    COMPLETED: "已完成",
    CANCELLED: "已取消"
  };
  return map[status] ?? status;
}

export function orderStage(status: string) {
  if (status === "PENDING_PAYMENT") return "待支付";
  if (["PAID", "MERCHANT_ACCEPTED", "READY_FOR_PICKUP"].includes(status)) return "商家处理中";
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
