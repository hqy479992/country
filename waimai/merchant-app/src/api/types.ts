export type ProductCategory = "FOOD" | "DRINK" | "FRUIT_VEGETABLE" | "CONVENIENCE";

export type Shop = {
  id: string;
  merchantId: string;
  name: string;
  logoUrl?: string | null;
  coverUrl?: string | null;
  announcement?: string | null;
  address: string;
  phone: string;
  businessHours?: string | null;
  deliveryFee: number;
  minOrderAmount: number;
  status?: "OPEN" | "CLOSED";
  products?: Product[];
};

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

export type Dashboard = {
  shop: Shop;
  todayOrderCount: number;
  todayRevenue: number;
  pendingCount: number;
  makingCount: number;
  readyCount: number;
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
  addressSnapshot: {
    name: string;
    phone: string;
    region: string;
    detail: string;
  };
  createdAt: string;
  completedAt?: string | null;
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
    rider?: {
      id: string;
      name: string;
      phone?: string | null;
    } | null;
  } | null;
  statusLogs?: Array<{
    id: string;
    fromStatus?: string | null;
    toStatus: string;
    note?: string | null;
    createdAt: string;
  }>;
};
