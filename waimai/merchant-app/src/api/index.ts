import { request } from "./request";
import type { Dashboard, Order, Product, ProductCategory, Shop } from "./types";

export const api = {
  getDashboard: () => request<Dashboard>("/api/merchant/dashboard"),
  getShop: () => request<Shop>("/api/merchant/shop"),
  updateShopStatus: (status: "OPEN" | "CLOSED") =>
    request<Shop>("/api/merchant/shop/status", {
      method: "POST",
      data: { status }
    }),
  updateShopProfile: (data: { phone?: string; announcement?: string; businessHours?: string }) =>
    request<Shop>("/api/merchant/shop/profile", {
      method: "PUT",
      data
    }),
  getProducts: () => request<Product[]>("/api/merchant/products"),
  createProduct: (data: {
    name: string;
    description?: string;
    category: ProductCategory;
    price: number;
    stock: number;
  }) => request<Product>("/api/merchant/products", { method: "POST", data }),
  updateProduct: (
    productId: string,
    data: Partial<{
      name: string;
      description: string;
      category: ProductCategory;
      price: number;
      stock: number;
      isOnSale: boolean;
    }>
  ) => request<Product>(`/api/merchant/products/${productId}`, { method: "PUT", data }),
  onSaleProduct: (productId: string) =>
    request<Product>(`/api/merchant/products/${productId}/on-sale`, { method: "POST" }),
  offSaleProduct: (productId: string) =>
    request<Product>(`/api/merchant/products/${productId}/off-sale`, { method: "POST" }),
  updateStock: (productId: string, stock: number) =>
    request<Product>(`/api/merchant/products/${productId}/stock`, {
      method: "POST",
      data: { stock }
    }),
  getOrders: () => request<Order[]>("/api/merchant/orders"),
  getOrder: (orderId: string) => request<Order>(`/api/merchant/orders/${orderId}`),
  acceptOrder: (orderId: string) =>
    request<Order>(`/api/merchant/orders/${orderId}/accept`, { method: "POST" }),
  rejectOrder: (orderId: string) =>
    request<Order>(`/api/merchant/orders/${orderId}/reject`, { method: "POST" }),
  readyOrder: (orderId: string) =>
    request<Order>(`/api/merchant/orders/${orderId}/ready`, { method: "POST" })
};
