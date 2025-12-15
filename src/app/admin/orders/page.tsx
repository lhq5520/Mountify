"use client";

import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Package } from "lucide-react";

type OrderItem = {
  productId: number;
  productName: string;
  imageUrl: string;
  quantity: number;
  price: string;
};

type Order = {
  id: number;
  userId: number | null;
  userName: string | null;
  email: string | null;
  total: string;
  status: string;
  stripeSessionId: string | null;
  createdAt: string;
  items: OrderItem[];
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/admin/orders");
        if (!res.ok) {
          throw new Error("Failed to load orders");
        }
        const data = await res.json();
        setOrders(data.orders ?? []);
      } catch (e) {
        console.error(e);
        setError("Unable to fetch orders. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  function getStatusColor(status: string) {
    switch (status?.toLowerCase()) {
      case "completed":
      case "paid":
        return "bg-green-100 text-green-700";
      case "pending":
        return "bg-yellow-100 text-yellow-700";
      case "cancelled":
      case "failed":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  }

  function toggleExpand(orderId: number) {
    setExpandedOrder(expandedOrder === orderId ? null : orderId);
  }

  return (
    <div className="container-custom py-10 md:py-14">
      {/* Header */}
      <header className="mb-6 md:mb-8">
        <div className="flex items-center gap-2 mb-2">
          <Package size={20} className="text-[var(--color-text-secondary)]" />
          <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-text-tertiary)]">
            Admin Panel
          </p>
        </div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-[var(--color-text-primary)]">
          Orders
        </h1>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
          View and manage customer orders
        </p>
      </header>

      {/* Stats Summary */}
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <div className="rounded-2xl bg-white p-5 shadow-sm border border-[var(--color-border)]">
          <p className="text-2xl font-semibold">{orders.length}</p>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Total Orders
          </p>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm border border-[var(--color-border)]">
          <p className="text-2xl font-semibold">
            $
            {orders
              .reduce((sum, o) => sum + parseFloat(o.total || "0"), 0)
              .toFixed(2)}
          </p>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Total Revenue
          </p>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm border border-[var(--color-border)]">
          <p className="text-2xl font-semibold">
            {
              orders.filter(
                (o) =>
                  o.status?.toLowerCase() === "completed" ||
                  o.status?.toLowerCase() === "paid"
              ).length
            }
          </p>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Completed Orders
          </p>
        </div>
      </div>

      {/* Orders List */}
      <div className="rounded-2xl bg-white shadow-sm border border-[var(--color-border)] overflow-hidden">
        {/* Loading */}
        {loading && (
          <div className="p-6 text-sm text-[var(--color-text-secondary)]">
            Loading orders…
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="p-6 text-sm text-red-500">{error}</div>
        )}

        {/* Empty state */}
        {!loading && !error && orders.length === 0 && (
          <div className="p-10 text-center">
            <p className="text-base font-medium text-[var(--color-text-primary)] mb-2">
              No orders yet
            </p>
            <p className="text-sm text-[var(--color-text-secondary)]">
              Once customers complete checkout, their orders will appear here.
            </p>
          </div>
        )}

        {/* Orders Table */}
        {!loading && !error && orders.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-[var(--color-border)]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                    Order
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                    Items
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {orders.map((order) => (
                  <>
                    <tr
                      key={order.id}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => toggleExpand(order.id)}
                    >
                      <td className="px-6 py-4">
                        <span className="font-medium text-[var(--color-text-primary)]">
                          #{order.id}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-[var(--color-text-primary)]">
                            {order.email || "Guest"}
                          </p>
                          <p className="text-xs text-[var(--color-text-tertiary)]">
                            {order.email || "No email"}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(
                            order.status
                          )}`}
                        >
                          {order.status || "Unknown"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-[var(--color-text-secondary)]">
                        {order.items.length} item
                        {order.items.length !== 1 ? "s" : ""}
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-[var(--color-text-primary)]">
                        ${parseFloat(order.total || "0").toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-right text-[var(--color-text-secondary)]">
                        {new Date(order.createdAt).toLocaleDateString("en-US", {
                          timeZone: "America/Los_Angeles",
                          minute: "2-digit",
                          hour: "2-digit",
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-6 py-4">
                        {expandedOrder === order.id ? (
                          <ChevronUp size={18} className="text-gray-400" />
                        ) : (
                          <ChevronDown size={18} className="text-gray-400" />
                        )}
                      </td>
                    </tr>

                    {/* Expanded Order Details */}
                    {expandedOrder === order.id && (
                      <tr key={`${order.id}-details`}>
                        <td colSpan={7} className="px-6 py-4 bg-gray-50">
                          <div className="space-y-3">
                            <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
                              Order Items
                            </p>
                            <div className="grid gap-3">
                              {order.items.map((item, idx) => (
                                <div
                                  key={idx}
                                  className="flex items-center gap-4 bg-white rounded-lg p-3 border border-[var(--color-border)]"
                                >
                                  <img
                                    src={item.imageUrl}
                                    alt={item.productName}
                                    className="w-12 h-12 rounded-lg object-cover bg-gray-100"
                                  />
                                  <div className="flex-1">
                                    <p className="font-medium text-[var(--color-text-primary)]">
                                      {item.productName}
                                    </p>
                                    <p className="text-xs text-[var(--color-text-secondary)]">
                                      Qty: {item.quantity} × $
                                      {parseFloat(item.price).toFixed(2)}
                                    </p>
                                  </div>
                                  <p className="font-semibold text-[var(--color-text-primary)]">
                                    $
                                    {(
                                      item.quantity * parseFloat(item.price)
                                    ).toFixed(2)}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
