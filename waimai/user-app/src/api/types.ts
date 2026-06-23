export type ProductCategory = "FOOD" | "DRINK" | "FRUIT_VEGETABLE" | "CONVENIENCE";
export type ShopSortMode = "COMPREHENSIVE" | "DISTANCE" | "MIN_ORDER" | "DELIVERY_FEE" | "SPEED" | "SALES";

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
  status: "OPEN" | "CLOSED";
  deliveryFee: number;
  minOrderAmount: number;
  products?: Product[];
  _count?: {
    orders: number;
  };
};

export type UserProfile = {
  id: string;
  phone?: string | null;
  nickname?: string | null;
  createdAt: string;
};

export type CartItem = {
  id: string;
  userId: string;
  shopId: string;
  productId: string;
  quantity: number;
  shop: Shop;
  product: Product;
};

export type UserAddress = {
  id: string;
  userId: string;
  name: string;
  phone: string;
  region: string;
  detail: string;
  isDefault: boolean;
};

export type Order = {
  id: string;
  orderNo: string;
  userId: string;
  shopId: string;
  addressSnapshot: {
    name: string;
    phone: string;
    region: string;
    detail: string;
  };
  remark?: string | null;
  goodsAmount: number;
  deliveryFee: number;
  totalAmount: number;
  status: string;
  paymentStatus: string;
  createdAt: string;
  paidAt?: string | null;
  completedAt?: string | null;
  shop?: Shop;
  items: Array<{
    id: string;
    productName: string;
    productImageUrl?: string | null;
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
};

export type ErrandOrder = {
  id: string;
  orderNo: string;
  userId: string;
  serviceType: "DELIVERY" | "BUY" | "HELP";
  deliveryMode: "SEND" | "PICK" | "EXPRESS";
  vehicleType: "BIKE" | "CAR";
  pickupAddressSnapshot: {
    name: string;
    phone: string;
    region: string;
    detail: string;
  };
  deliveryAddressSnapshot: {
    name: string;
    phone: string;
    region: string;
    detail: string;
  };
  itemNote?: string | null;
  remark?: string | null;
  distanceText?: string | null;
  baseFee: number;
  totalAmount: number;
  status: string;
  paymentStatus: string;
  paidAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
};
