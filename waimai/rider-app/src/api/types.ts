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

export type ErrandTask = {
  id: string;
  orderNo: string;
  serviceType: string;
  deliveryMode: string;
  status: string;
  totalAmount: number;
  createdAt: string;
  paymentMethod?: string;
  itemNote: string;
  remark?: string;
  goodsBudget?: number | null;
  riderId?: string | null;
  pickupAddressSnapshot: {
    region: string;
    detail?: string;
    name?: string;
    phone?: string;
  };
  deliveryAddressSnapshot: {
    region: string;
    detail?: string;
    name?: string;
    phone?: string;
  };
  statusLogs?: Array<{ id: string; note: string; createdAt: string }>;
};
