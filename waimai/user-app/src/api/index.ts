import { request } from "./request";
import type { CartItem, ErrandOrder, Order, ProductCategory, Shop, ShopSortMode, UserAddress, UserProfile } from "./types";

export const api = {
  getShops: (params?: { category?: ProductCategory; keyword?: string; sortBy?: ShopSortMode }) => {
    const queryItems = [
      params?.category ? `category=${encodeURIComponent(params.category)}` : "",
      params?.keyword ? `keyword=${encodeURIComponent(params.keyword)}` : "",
      params?.sortBy ? `sortBy=${encodeURIComponent(params.sortBy)}` : ""
    ].filter(Boolean);
    const query = queryItems.length > 0 ? `?${queryItems.join("&")}` : "";
    return request<Shop[]>(`/api/shops${query}`);
  },
  getShop: (shopId: string) => request<Shop>(`/api/shops/${shopId}`),
  getProfile: () => request<UserProfile>("/api/user/profile"),
  getAddresses: () => request<UserAddress[]>("/api/user/addresses"),
  createAddress: (data: {
    name: string;
    phone: string;
    region: string;
    detail: string;
    isDefault: boolean;
  }) => request<UserAddress>("/api/user/addresses", { method: "POST", data }),
  updateAddress: (
    addressId: string,
    data: Partial<{
      name: string;
      phone: string;
      region: string;
      detail: string;
      isDefault: boolean;
    }>
  ) => request<UserAddress>(`/api/user/addresses/${addressId}`, { method: "PUT", data }),
  setDefaultAddress: (addressId: string) =>
    request<UserAddress>(`/api/user/addresses/${addressId}/default`, { method: "POST" }),
  deleteAddress: (addressId: string) =>
    request<void>(`/api/user/addresses/${addressId}`, { method: "DELETE" }),
  getCart: () => request<CartItem[]>("/api/cart"),
  addCartItem: (productId: string, quantity = 1) =>
    request<CartItem>("/api/cart/items", {
      method: "POST",
      data: { productId, quantity }
    }),
  updateCartItem: (itemId: string, quantity: number) =>
    request<CartItem>(`/api/cart/items/${itemId}/quantity`, {
      method: "POST",
      data: { quantity }
    }),
  removeCartItem: (itemId: string) =>
    request<void>(`/api/cart/items/${itemId}`, {
      method: "DELETE"
    }),
  clearCart: () => request<void>("/api/cart", { method: "DELETE" }),
  createOrder: (addressId: string, remark?: string) =>
    request<Order>("/api/orders", {
      method: "POST",
      data: { addressId, remark }
    }),
  payMock: (orderId: string) =>
    request<Order>(`/api/orders/${orderId}/pay/mock`, {
      method: "POST"
    }),
  getOrders: () => request<Order[]>("/api/orders"),
  getOrder: (orderId: string) => request<Order>(`/api/orders/${orderId}`),
  createErrandOrder: (data: {
    serviceType: "DELIVERY" | "BUY" | "HELP";
    deliveryMode: "SEND" | "PICK" | "EXPRESS";
    vehicleType: "BIKE" | "CAR";
    pickupAddress: {
      name: string;
      phone: string;
      region: string;
      detail: string;
    };
    deliveryAddress: {
      name: string;
      phone: string;
      region: string;
      detail: string;
    };
    itemNote?: string;
    remark?: string;
  }) => request<ErrandOrder>("/api/user/errand-orders", { method: "POST", data }),
  getErrandOrders: () => request<ErrandOrder[]>("/api/user/errand-orders"),
  getErrandOrder: (orderId: string) => request<ErrandOrder>(`/api/user/errand-orders/${orderId}`)
};
