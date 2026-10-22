import type { ErrandOrder } from "../api/types";
import { yuan } from "./format";
export function errandFee(order: ErrandOrder) {
  return order.status === "PENDING_QUOTE"
    ? "待平台报价"
    : !order.quotedAt && !order.paidAt
      ? "未报价"
      : yuan(order.totalAmount);
}
export function errandLabel(
  order: Pick<ErrandOrder, "serviceType" | "deliveryMode">,
) {
  return order.serviceType === "BUY"
    ? "帮我买"
    : order.deliveryMode === "PICK"
      ? "帮我取"
      : "帮我送";
}
export function errandStatus(status: string) {
  return (
    (
      {
        PENDING_QUOTE: "待平台报价",
        PENDING_PAYMENT: "待确认报价",
        PENDING_ASSIGN: "等待骑手",
        RIDER_ACCEPTED: "骑手已接单",
        PICKED_UP: "配送中",
        DELIVERED: "已送达",
        COMPLETED: "已完成",
        CANCELLED: "已取消",
      } as Record<string, string>
    )[status] || status
  );
}
export function canCancelErrand(order: ErrandOrder) {
  return (
    ["PENDING_QUOTE", "PENDING_PAYMENT"].includes(order.status) ||
    (order.status === "PENDING_ASSIGN" && order.paymentMethod === "MOCK")
  );
}
