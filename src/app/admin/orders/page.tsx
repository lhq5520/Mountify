// /admin/orders page

"use client";

import { useEffect, useState } from "react";

type Order = {
  id: number;
  email: string | null;
  total_cad: string;
  created_at: string;
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <main className="bg-gradient-to-b from-[#f5f5f7] to-white min-h-[calc(100vh-64px)]">
      <div className="container-custom py-10 md:py-14">
        {/* Header */}
        <header className="mb-6 md:mb-8 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-tertiary)]">
              Admin
            </p>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-[var(--color-text-primary)]">
              Orders
            </h1>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
              View recent checkout sessions and basic order information.
            </p>
          </div>

          {/* Placeholder for future filters */}
          <div className="flex gap-3 text-xs md:text-sm text-[var(--color-text-secondary)]">
            <span className="hidden rounded-full border border-[var(--color-border)] bg-white px-3 py-1.5 md:inline-flex items-center">
              All orders
            </span>
          </div>
        </header>

        {/* Card */}
        <section className="w-full overflow-hidden rounded-2xl border border-[var(--color-border)] bg-white shadow-sm">
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
            <div className="p-10 text-center text-sm text-[var(--color-text-secondary)]">
              <p className="mb-2 text-base font-medium text-[var(--color-text-primary)]">
                No orders yet
              </p>
              <p>
                Once customers complete checkout, their orders will appear here.
              </p>
            </div>
          )}

          {/* Table */}
          {!loading && !error && orders.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full border-t border-[var(--color-border)] text-sm">
                <thead className="bg-[#f9fafb] text-xs uppercase tracking-wide text-[var(--color-text-tertiary)]">
                  <tr>
                    <th className="px-4 py-3 text-left">Order</th>
                    <th className="px-4 py-3 text-left">Customer</th>
                    <th className="px-4 py-3 text-right">Total (CAD)</th>
                    <th className="px-4 py-3 text-right">Created at</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {orders.map((o) => (
                    <tr key={o.id} className="hover:bg-[#fafafa]">
                      <td className="px-4 py-3 align-middle">
                        <span className="font-medium text-[var(--color-text-primary)]">
                          #{o.id}
                        </span>
                      </td>
                      <td className="px-4 py-3 align-middle">
                        <span className="text-[var(--color-text-primary)]">
                          {o.email ?? "No email"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right align-middle">
                        <span className="font-medium text-[var(--color-text-primary)]">
                          ${Number.parseFloat(o.total_cad || "0").toFixed(2)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right align-middle">
                        <span className="text-[var(--color-text-secondary)]">
                          {new Date(o.created_at).toLocaleString()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
