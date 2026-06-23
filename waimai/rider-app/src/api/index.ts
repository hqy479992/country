import { request } from "./request";
import type { DeliveryOrder } from "./types";

export const api = {
  getAvailableOrders: () => request<DeliveryOrder[]>("/api/rider/orders/available"),
  getMyOrders: () => request<DeliveryOrder[]>("/api/rider/orders"),
  getOrder: (deliveryOrderId: string) =>
    request<DeliveryOrder>(`/api/rider/orders/${deliveryOrderId}`),
  acceptOrder: (deliveryOrderId: string) =>
    request<DeliveryOrder>(`/api/rider/orders/${deliveryOrderId}/accept`, { method: "POST" }),
  pickupOrder: (deliveryOrderId: string) =>
    request<DeliveryOrder>(`/api/rider/orders/${deliveryOrderId}/pickup`, { method: "POST" }),
  deliverOrder: (deliveryOrderId: string) =>
    request<DeliveryOrder>(`/api/rider/orders/${deliveryOrderId}/deliver`, { method: "POST" })
};
