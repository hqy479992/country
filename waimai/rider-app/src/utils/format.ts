export function yuan(cents: number) {
  return `¥${(cents / 100).toFixed(2)}`;
}

export function statusText(status: string) {
  const map: Record<string, string> = {
    PENDING_ASSIGN: "待接单",
    RIDER_ACCEPTED: "已接单",
    PICKED_UP: "配送中",
    DELIVERED: "已送达",
    CANCELLED: "已取消",
    READY_FOR_PICKUP: "待取货",
    COMPLETED: "已完成"
  };
  return map[status] ?? status;
}

export function canAccept(status: string) {
  return status === "PENDING_ASSIGN";
}

export function canPickup(status: string) {
  return status === "RIDER_ACCEPTED";
}

export function canDeliver(status: string) {
  return status === "PICKED_UP";
}
