export type Shop = {
  id: string;
  name: string;
  address: string;
  phone: string;
};

export type Order = {
  id: string;
  orderNo: string;
  status: string;
  totalAmount: number;
  deliveryFee: number;
  remark?: string | null;
  addressSnapshot: {
    name: string;
    phone: string;
    region: string;
    detail: string;
  };
  createdAt: string;
  shop: Shop;
  items: Array<{
    id: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
};

export type DeliveryOrder = {
  id: string;
  orderId: string;
  riderId?: string | null;
  status: string;
  acceptedAt?: string | null;
  pickedUpAt?: string | null;
  deliveredAt?: string | null;
  createdAt: string;
  order: Order;
  rider?: {
    id: string;
    name: string;
    phone?: string | null;
  } | null;
};
