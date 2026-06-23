const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3000";

type ApiResponse<T> = {
  data: T;
};

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
};

async function request<T>(path: string, options: RequestOptions = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      "x-actor-type": "ADMIN",
      "x-actor-id": "admin-dev"
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  const text = await response.text();
  const json = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message = json?.error?.message ?? "请求失败";
    throw new Error(message);
  }

  return (json as ApiResponse<T>).data;
}

export type User = {
  id: string;
  phone?: string | null;
  nickname?: string | null;
  addresses: Address[];
  _count?: { orders: number };
};

export type Address = {
  id: string;
  userId: string;
  name: string;
  phone: string;
  region: string;
  detail: string;
  isDefault: boolean;
};

export type Shop = {
  id: string;
  name: string;
  address: string;
  phone: string;
  logoUrl?: string | null;
  coverUrl?: string | null;
  announcement?: string | null;
  businessHours?: string | null;
  status: "OPEN" | "CLOSED";
  deliveryFee: number;
  minOrderAmount: number;
  merchant: {
    id: string;
    name: string;
    phone?: string | null;
  };
  products: Product[];
  _count?: { orders: number };
};

export type ProductCategory = "FOOD" | "DRINK" | "FRUIT_VEGETABLE" | "CONVENIENCE";

export type Product = {
  id: string;
  shopId: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  category: ProductCategory;
  price: number;
  stock: number;
  isOnSale: boolean;
};

export type Rider = {
  id: string;
  name: string;
  phone?: string | null;
  isOnline: boolean;
  _count?: { deliveryOrders: number };
};

export type Order = {
  id: string;
  orderNo: string;
  status: string;
  paymentStatus: string;
  goodsAmount: number;
  deliveryFee: number;
  totalAmount: number;
  remark?: string | null;
  createdAt: string;
  user: {
    id: string;
    nickname?: string | null;
    phone?: string | null;
  };
  shop: Shop;
  items: Array<{
    id: string;
    productName: string;
    unitPrice: number;
    quantity: number;
    totalPrice: number;
  }>;
  deliveryOrder?: {
    id: string;
    status: string;
    rider?: Rider | null;
  } | null;
};

export const api = {
  getUsers: () => request<User[]>("/api/admin/users"),
  createUser: (body: { nickname?: string; phone?: string }) =>
    request<User>("/api/admin/users", { method: "POST", body: compact(body) }),
  createAddress: (body: {
    userId: string;
    name: string;
    phone: string;
    region: string;
    detail: string;
    isDefault: boolean;
  }) => request<Address>("/api/admin/addresses", { method: "POST", body }),
  getShops: () => request<Shop[]>("/api/admin/shops"),
  createShop: (body: {
    merchantName: string;
    merchantPhone?: string;
    shopName: string;
    address: string;
    phone: string;
    deliveryFee: number;
    minOrderAmount: number;
  }) => request<Shop>("/api/admin/shops", { method: "POST", body: compact(body) }),
  updateShop: (
    shopId: string,
    body: Partial<{
      name: string;
      address: string;
      phone: string;
      logoUrl: string;
      coverUrl: string;
      deliveryFee: number;
      minOrderAmount: number;
      status: "OPEN" | "CLOSED";
    }>
  ) => request<Shop>(`/api/admin/shops/${shopId}`, { method: "PUT", body: compact(body) }),
  createProduct: (
    shopId: string,
    body: {
      name: string;
      description?: string;
      category?: ProductCategory;
      price: number;
      stock: number;
    }
  ) => request<Product>(`/api/admin/shops/${shopId}/products`, { method: "POST", body: compact(body) }),
  getRiders: () => request<Rider[]>("/api/admin/riders"),
  createRider: (body: { name: string; phone?: string }) =>
    request<Rider>("/api/admin/riders", { method: "POST", body: compact(body) }),
  getOrders: () => request<Order[]>("/api/admin/orders")
};

export function yuan(cents: number) {
  return `¥${(cents / 100).toFixed(2)}`;
}

export function yuanToCents(value: FormDataEntryValue | null) {
  const amount = Number(value || 0);
  return Math.round(amount * 100);
}

function compact<T extends Record<string, unknown>>(body: T) {
  return Object.fromEntries(
    Object.entries(body).filter(([, value]) => value !== "" && value !== undefined && value !== null)
  );
}
