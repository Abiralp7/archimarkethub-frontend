import api from './apiClient';

type OrderStatus = 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

// Types
export interface OrderItem {
  productId: string;
  quantity: number;
  unitPrice: number;
}

export interface CreateOrderPayload {
  items: OrderItem[];
  shippingName: string;
  shippingPhone: string;
  shippingAddress: string;
  shippingCity?: string;
  shippingPostalCode?: string;
  shippingCountry?: string;
  notes?: string;
}

export interface OrderResponse {
  id: string;
  userId: string;
  supplierId: string;
  orderStatus: OrderStatus;
  paymentMethod: string;
  totalPrice: number;
  shippingName: string;
  shippingPhone: string;
  shippingAddress: string;
  shippingCity?: string;
  shippingPostalCode?: string;
  shippingCountry?: string;
  notes?: string;
  items: Array<{
    id: string;
    productId: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    product?: any;
  }>;
  supplier?: {
    id: string;
    name: string;
    logoUrl?: string;
  };
  createdAt: string;
  updatedAt: string;
}

// Create order
export async function createOrder(payload: CreateOrderPayload) {
  const res = await api.post('/orders', payload);
  return res.data;
}

// Get customer's orders
export async function getMyOrders(skip = 0, take = 10) {
  const res = await api.get('/orders/me', {
    params: { skip, take },
  });
  return res.data;
}

// Get single order
export async function getOrder(orderId: string) {
  const res = await api.get(`/orders/${orderId}`);
  return res.data;
}

// Cancel order
export async function cancelOrder(orderId: string) {
  const res = await api.delete(`/orders/${orderId}`);
  return res.data;
}

// Supplier: Get supplier's orders
export async function getSupplierOrders(skip = 0, take = 10, status?: OrderStatus) {
  const res = await api.get('/orders/supplier', {
    params: { skip, take, status: status || undefined },
  });
  return res.data;
}

// Update order status (Supplier/Admin)
export async function updateOrderStatus(orderId: string, orderStatus: OrderStatus) {
  const res = await api.patch(`/orders/${orderId}/status`, { orderStatus });
  return res.data;
}

// Admin: Get all orders
export async function getAllOrders(skip = 0, take = 10, status?: OrderStatus) {
  const res = await api.get('/orders', {
    params: { skip, take, status: status || undefined },
  });
  return res.data;
}

// Admin: Get order statistics
export async function getOrderStats() {
  const res = await api.get('/orders/stats/dashboard');
  return res.data;
}
