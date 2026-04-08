'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  getMyOrders,
  cancelOrder,
  getOrder,
  type OrderResponse,
} from '@/lib/orderApi';
import { ChevronLeft, Eye, X, AlertCircle } from 'lucide-react';

type OrderStatus = 'PENDING' | 'CONFIRMED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

const orderStatusColors: Record<OrderStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-blue-100 text-blue-800',
  SHIPPED: 'bg-purple-100 text-purple-800',
  DELIVERED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

const orderStatusDisplay: Record<OrderStatus, string> = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  SHIPPED: 'Shipped',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

export default function OrdersPage() {
  const [selectedOrder, setSelectedOrder] = useState<OrderResponse | null>(null);
  const [skip, setSkip] = useState(0);
  const take = 10;

  // Fetch orders
  const ordersQ = useQuery({
    queryKey: ['orders', 'my', skip, take],
    queryFn: () => getMyOrders(skip, take),
    staleTime: 1000 * 30, // Refresh every 30 seconds
  });

  // Cancel order mutation
  const cancelMutation = useMutation({
    mutationFn: cancelOrder,
    onSuccess: () => {
      ordersQ.refetch();
      setSelectedOrder(null);
    },
  });

  const orders = ordersQ.data?.data || [];
  const total = ordersQ.data?.total || 0;
  const totalPages = Math.ceil(total / take);
  const currentPage = Math.floor(skip / take) + 1;

  const canCancel = (status: OrderStatus) => {
    return status === 'PENDING' || status === 'CONFIRMED';
  };

  if (selectedOrder) {
    return (
      <div className="min-h-screen bg-slate-50">
        <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
            <button
              onClick={() => setSelectedOrder(null)}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold"
            >
              <ChevronLeft className="h-5 w-5" />
              Back to Orders
            </button>
          </div>
        </header>

        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            {/* Order Header */}
            <div className="border-b border-slate-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">
                    Order #{selectedOrder.id.slice(0, 8).toUpperCase()}
                  </h1>
                  <p className="text-sm text-slate-600 mt-1">
                    Placed on{' '}
                    {new Date(selectedOrder.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <span
                  className={`px-4 py-2 rounded-full text-sm font-semibold ${
                    orderStatusColors[selectedOrder.orderStatus]
                  }`}
                >
                  {orderStatusDisplay[selectedOrder.orderStatus]}
                </span>
              </div>
            </div>

            {/* Order Items */}
            <div className="border-b border-slate-200 p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-4">
                Items Ordered
              </h2>
              <div className="space-y-3">
                {selectedOrder.items.map((item) => (
                  <div
                    key={item.id}
                    className="flex gap-4 pb-3 border-b border-slate-200 last:border-b-0"
                  >
                    <div className="flex-1">
                      <h3 className="font-semibold text-slate-900">
                        {item.product?.name || `Product ${item.productId}`}
                      </h3>
                      <p className="text-sm text-slate-600">
                        Qty: {item.quantity} × Rs. {Number(item.unitPrice).toFixed(2)}
                      </p>
                    </div>
                    <p className="font-semibold text-slate-900">
                      Rs. {Number(item.subtotal).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Shipping Information */}
            <div className="border-b border-slate-200 p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-4">
                Shipping Address
              </h2>
              <div className="text-slate-700 space-y-1">
                <p className="font-semibold">{selectedOrder.shippingName}</p>
                <p>{selectedOrder.shippingAddress}</p>
                {selectedOrder.shippingCity && (
                  <p>{selectedOrder.shippingCity}</p>
                )}
                {selectedOrder.shippingPostalCode && (
                  <p>{selectedOrder.shippingPostalCode}</p>
                )}
                {selectedOrder.shippingCountry && (
                  <p>{selectedOrder.shippingCountry}</p>
                )}
                <p className="mt-2 font-semibold">{selectedOrder.shippingPhone}</p>
              </div>
            </div>

            {/* Supplier Information */}
            <div className="border-b border-slate-200 p-6">
              <h2 className="text-lg font-bold text-slate-900 mb-4">
                Supplier
              </h2>
              <div className="flex items-center gap-4">
                {selectedOrder.supplier?.logoUrl && (
                  <img
                    src={selectedOrder.supplier.logoUrl}
                    alt={selectedOrder.supplier.name}
                    className="h-12 w-12 rounded-lg object-cover"
                  />
                )}
                <div>
                  <p className="font-semibold text-slate-900">
                    {selectedOrder.supplier?.name}
                  </p>
                </div>
              </div>
            </div>

            {/* Payment & Total */}
            <div className="border-b border-slate-200 p-6">
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span>Rs. {Number(selectedOrder.totalPrice).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Payment Method</span>
                  <span className="font-semibold">Cash on Delivery (COD)</span>
                </div>
                <div className="border-t border-slate-200 pt-2 flex justify-between text-lg font-bold text-slate-900">
                  <span>Total</span>
                  <span>Rs. {Number(selectedOrder.totalPrice).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            {selectedOrder.notes && (
              <div className="border-b border-slate-200 p-6">
                <h3 className="font-semibold text-slate-900 mb-2">Notes</h3>
                <p className="text-slate-700">{selectedOrder.notes}</p>
              </div>
            )}

            {/* Actions */}
            <div className="p-6">
              {canCancel(selectedOrder.orderStatus) ? (
                <button
                  onClick={() => {
                    if (
                      confirm(
                        'Are you sure you want to cancel this order?',
                      )
                    ) {
                      cancelMutation.mutate(selectedOrder.id);
                    }
                  }}
                  disabled={cancelMutation.isPending}
                  className="px-6 py-2 border border-red-300 text-red-700 rounded-lg font-semibold hover:bg-red-50 transition disabled:bg-slate-100"
                >
                  {cancelMutation.isPending
                    ? 'Cancelling...'
                    : 'Cancel Order'}
                </button>
              ) : (
                <div className="flex items-gap-2 gap-2 text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <AlertCircle className="h-5 w-5 flex-shrink-0" />
                  <p>
                    This order cannot be cancelled as it has already been{' '}
                    {selectedOrder.orderStatus === 'SHIPPED'
                      ? 'shipped'
                      : 'delivered'}
                    .
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
              M
            </div>
            <span className="font-bold text-slate-900">MaterialHub</span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link
              href="/products"
              className="text-slate-600 hover:text-slate-900 font-semibold"
            >
              Products
            </Link>
            <Link
              href="/checkout"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
            >
              Checkout
            </Link>
          </nav>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">My Orders</h1>
        <p className="text-slate-600 mb-8">
          Track and manage your orders below.
        </p>

        {ordersQ.isLoading && (
          <div className="text-center py-12 text-slate-600">
            Loading your orders...
          </div>
        )}

        {!ordersQ.isLoading && orders.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg">
            <p className="text-slate-600 mb-4">
              You haven't placed any orders yet.
            </p>
            <Link
              href="/products"
              className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
            >
              Continue Shopping
            </Link>
          </div>
        )}

        {!ordersQ.isLoading && orders.length > 0 && (
          <>
            <div className="grid grid-cols-1 gap-4">
              {orders.map((order: OrderResponse) => (
                <div
                  key={order.id}
                  className="bg-white rounded-lg shadow-sm border border-slate-200 hover:shadow-md transition p-6"
                >
                  <div className="flex items-start justify-between md:items-center gap-4 mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">
                        Order #{order.id.slice(0, 8).toUpperCase()}
                      </h3>
                      <p className="text-sm text-slate-600">
                        Placed on{' '}
                        {new Date(order.createdAt).toLocaleDateString(
                          'en-US',
                          {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          },
                        )}
                      </p>
                    </div>
                    <span
                      className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap ${
                        orderStatusColors[order.orderStatus]
                      }`}
                    >
                      {orderStatusDisplay[order.orderStatus]}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4 pb-4 border-t border-slate-200 pt-4">
                    <div>
                      <p className="text-sm text-slate-600">Items</p>
                      <p className="font-semibold text-slate-900">
                        {order.items.reduce((sum, item) => sum + item.quantity, 0)} items
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Total Price</p>
                      <p className="font-bold text-slate-900">
                        Rs. {Number(order.totalPrice).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-600">Supplier</p>
                      <p className="font-semibold text-slate-900">
                        {order.supplier?.name}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 pt-4 border-t border-slate-200">
                    <button
                      onClick={() => setSelectedOrder(order)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
                    >
                      <Eye className="h-4 w-4" />
                      View Details
                    </button>
                    {canCancel(order.orderStatus) && (
                      <button
                        onClick={() => {
                          if (
                            confirm(
                              'Are you sure you want to cancel this order?',
                            )
                          ) {
                            cancelMutation.mutate(order.id);
                          }
                        }}
                        disabled={cancelMutation.isPending}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-red-300 text-red-700 rounded-lg font-semibold hover:bg-red-50 transition disabled:bg-slate-100"
                      >
                        <X className="h-4 w-4" />
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-4">
                <button
                  onClick={() => setSkip(Math.max(0, skip - take))}
                  disabled={skip === 0}
                  className="px-4 py-2 border border-slate-300 text-slate-900 rounded-lg font-semibold hover:bg-slate-50 transition disabled:bg-slate-100 disabled:text-slate-400"
                >
                  Previous
                </button>

                <span className="text-slate-600">
                  Page {currentPage} of {totalPages}
                </span>

                <button
                  onClick={() => setSkip(skip + take)}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 border border-slate-300 text-slate-900 rounded-lg font-semibold hover:bg-slate-50 transition disabled:bg-slate-100 disabled:text-slate-400"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
