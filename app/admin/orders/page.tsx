'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getAllOrders, updateOrderStatus, getOrderStats } from '@/lib/orderApi';
import { ChevronLeft, Eye, Filter, Package, TrendingUp } from 'lucide-react';

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

const statusActions: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};

export default function AdminOrdersPage() {
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | undefined>();
  const [skip, setSkip] = useState(0);
  const take = 10;

  const ordersQ = useQuery({
    queryKey: ['orders', 'admin', skip, take, selectedStatus],
    queryFn: () => getAllOrders(skip, take, selectedStatus),
    staleTime: 1000 * 30,
  });

  const statsQ = useQuery({
    queryKey: ['orders', 'stats'],
    queryFn: getOrderStats,
    staleTime: 1000 * 30,
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({
      orderId,
      status,
    }: {
      orderId: string;
      status: OrderStatus;
    }) => updateOrderStatus(orderId, status),
    onSuccess: () => {
      ordersQ.refetch();
      statsQ.refetch();
    },
  });

  const orders = ordersQ.data?.data || [];
  const total = ordersQ.data?.total || 0;
  const totalPages = Math.ceil(total / take);
  const currentPage = Math.floor(skip / take) + 1;

  const stats = statsQ.data?.data || {
    totalOrders: 0,
    pendingOrders: 0,
    confirmedOrders: 0,
    shippedOrders: 0,
    deliveredOrders: 0,
    cancelledOrders: 0,
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            href="/admin"
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-semibold"
          >
            <ChevronLeft className="h-5 w-5" />
            Back to Dashboard
          </Link>
          <h1 className="text-lg font-bold text-slate-900">All Orders</h1>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6 border-t-4 border-slate-500">
            <p className="text-xs text-slate-600 uppercase font-semibold mb-1">
              Total Orders
            </p>
            <div className="flex items-end gap-2">
              <p className="text-3xl font-bold text-slate-900">
                {stats.totalOrders}
              </p>
              <TrendingUp className="h-4 w-4 text-slate-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border-t-4 border-yellow-500">
            <p className="text-xs text-slate-600 uppercase font-semibold mb-1">
              Pending
            </p>
            <p className="text-3xl font-bold text-yellow-700">
              {stats.pendingOrders}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border-t-4 border-blue-500">
            <p className="text-xs text-slate-600 uppercase font-semibold mb-1">
              Confirmed
            </p>
            <p className="text-3xl font-bold text-blue-700">
              {stats.confirmedOrders}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border-t-4 border-purple-500">
            <p className="text-xs text-slate-600 uppercase font-semibold mb-1">
              Shipped
            </p>
            <p className="text-3xl font-bold text-purple-700">
              {stats.shippedOrders}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border-t-4 border-green-500">
            <p className="text-xs text-slate-600 uppercase font-semibold mb-1">
              Delivered
            </p>
            <p className="text-3xl font-bold text-green-700">
              {stats.deliveredOrders}
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border-t-4 border-red-500">
            <p className="text-xs text-slate-600 uppercase font-semibold mb-1">
              Cancelled
            </p>
            <p className="text-3xl font-bold text-red-700">
              {stats.cancelledOrders}
            </p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6 border-b border-slate-200 overflow-x-auto">
          <button
            onClick={() => {
              setSelectedStatus(undefined);
              setSkip(0);
            }}
            className={`px-4 py-2 font-semibold border-b-2 transition whitespace-nowrap ${
              selectedStatus === undefined
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            All Orders
          </button>
          {(['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED'] as OrderStatus[]).map(
            (status) => (
              <button
                key={status}
                onClick={() => {
                  setSelectedStatus(status);
                  setSkip(0);
                }}
                className={`px-4 py-2 font-semibold border-b-2 transition whitespace-nowrap ${
                  selectedStatus === status
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-600 hover:text-slate-900'
                }`}
              >
                {orderStatusDisplay[status]}
              </button>
            ),
          )}
        </div>

        {/* Orders Table */}
        {ordersQ.isLoading && (
          <div className="text-center py-12 text-slate-600">
            Loading orders...
          </div>
        )}

        {!ordersQ.isLoading && orders.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg">
            <Package className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600">No orders found.</p>
          </div>
        )}

        {!ordersQ.isLoading && orders.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-4 text-left font-semibold text-slate-900">
                      Order ID
                    </th>
                    <th className="px-6 py-4 text-left font-semibold text-slate-900">
                      Customer
                    </th>
                    <th className="px-6 py-4 text-left font-semibold text-slate-900">
                      Supplier
                    </th>
                    <th className="px-6 py-4 text-left font-semibold text-slate-900">
                      Items
                    </th>
                    <th className="px-6 py-4 text-left font-semibold text-slate-900">
                      Total
                    </th>
                    <th className="px-6 py-4 text-left font-semibold text-slate-900">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left font-semibold text-slate-900">
                      Date
                    </th>
                    <th className="px-6 py-4 text-left font-semibold text-slate-900">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {orders.map((order: any) => (
                    <tr key={order.id} className="hover:bg-slate-50 transition">
                      <td className="px-6 py-4 font-mono text-slate-900 font-semibold">
                        {order.id.slice(0, 8).toUpperCase()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900">
                          {order.user?.email || 'N/A'}
                        </div>
                        <div className="text-xs text-slate-600">
                          {order.shippingName}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-900">
                          {order.supplier?.name || 'N/A'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {order.items?.reduce(
                          (sum: number, item: any) => sum + item.quantity,
                          0,
                        ) || 0}{' '}
                        items
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-900">
                        Rs. {Number(order.totalPrice).toFixed(2)}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            orderStatusColors[
                              order.orderStatus as OrderStatus
                            ]
                          }`}
                        >
                          {orderStatusDisplay[
                            order.orderStatus as OrderStatus
                          ]}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {new Date(order.createdAt).toLocaleDateString(
                          'en-US',
                          {
                            month: 'short',
                            day: 'numeric',
                            year: '2-digit',
                          },
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => alert(JSON.stringify(order, null, 2))}
                            className="text-blue-600 hover:text-blue-700 font-semibold"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {statusActions[
                            order.orderStatus as OrderStatus
                          ].length > 0 && (
                            <select
                              value=""
                              onChange={(e) => {
                                if (e.target.value) {
                                  updateStatusMutation.mutate({
                                    orderId: order.id,
                                    status: e.target.value as OrderStatus,
                                  });
                                }
                              }}
                              disabled={updateStatusMutation.isPending}
                              className="text-xs border border-slate-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="">Update</option>
                              {statusActions[
                                order.orderStatus as OrderStatus
                              ].map((status) => (
                                <option key={status} value={status}>
                                  {orderStatusDisplay[status]}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 p-6 border-t border-slate-200">
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
          </div>
        )}
      </div>
    </div>
  );
}
