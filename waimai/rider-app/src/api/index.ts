import { request } from "./request";
import type { DeliveryOrder, ErrandTask } from "./types";

export const api = {
  getAvailableErrands: () =>
    request<ErrandTask[]>("/api/rider/errands/available"),
  getMyErrands: () => request<ErrandTask[]>("/api/rider/errands"),
  getErrand: (id: string) => request<ErrandTask>(`/api/rider/errands/${id}`),
  errandAction: (id: string, action: "accept" | "pickup" | "deliver") =>
    request<ErrandTask>(`/api/rider/errands/${id}/${action}`, {
      method: "POST",
    }),
  getAvailableOrders: () =>
    request<DeliveryOrder[]>("/api/rider/orders/available"),
  getMyOrders: () => request<DeliveryOrder[]>("/api/rider/orders"),
  getOrder: (deliveryOrderId: string) =>
    request<DeliveryOrder>(`/api/rider/orders/${deliveryOrderId}`),
  acceptOrder: (deliveryOrderId: string) =>
    request<DeliveryOrder>(`/api/rider/orders/${deliveryOrderId}/accept`, {
      method: "POST",
    }),
  pickupOrder: (deliveryOrderId: string) =>
    request<DeliveryOrder>(`/api/rider/orders/${deliveryOrderId}/pickup`, {
      method: "POST",
    }),
  deliverOrder: (deliveryOrderId: string) =>
    request<DeliveryOrder>(`/api/rider/orders/${deliveryOrderId}/deliver`, {
      method: "POST",
    }),
};
