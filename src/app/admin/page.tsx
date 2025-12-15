"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Package, ShoppingCart, TrendingUp, Clock } from "lucide-react";

interface Stats {
  products: number;
  orders: number;
  revenue: number;
  recentOrders: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/admin/stats");
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (e) {
        console.error("Failed to fetch stats:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  return (
    <div className="container-custom py-10 md:py-14">
      <header className="mb-8">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-[var(--color-text-primary)]">
          Dashboard
        </h1>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
          Welcome back! Here's an overview of your store.
        </p>
      </header>

      {/* Quick Stats */}
      <div className="grid gap-6 md:grid-cols-4 mb-8">
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-[var(--color-border)]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
              <Package size={24} className="text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold">
                {loading ? (
                  <span className="inline-block w-8 h-6 bg-gray-200 animate-pulse rounded" />
                ) : (
                  stats?.products ?? 0
                )}
              </p>
              <p className="text-sm text-[var(--color-text-secondary)]">
                Products
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm border border-[var(--color-border)]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <ShoppingCart size={24} className="text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold">
                {loading ? (
                  <span className="inline-block w-8 h-6 bg-gray-200 animate-pulse rounded" />
                ) : (
                  stats?.orders ?? 0
                )}
              </p>
              <p className="text-sm text-[var(--color-text-secondary)]">
                Total Orders
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm border border-[var(--color-border)]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
              <TrendingUp size={24} className="text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold">
                {loading ? (
                  <span className="inline-block w-12 h-6 bg-gray-200 animate-pulse rounded" />
                ) : (
                  `$${(stats?.revenue ?? 0).toFixed(2)}`
                )}
              </p>
              <p className="text-sm text-[var(--color-text-secondary)]">
                Revenue
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm border border-[var(--color-border)]">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
              <Clock size={24} className="text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-semibold">
                {loading ? (
                  <span className="inline-block w-8 h-6 bg-gray-200 animate-pulse rounded" />
                ) : (
                  stats?.recentOrders ?? 0
                )}
              </p>
              <p className="text-sm text-[var(--color-text-secondary)]">
                Orders (7 days)
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid gap-4 md:grid-cols-2">
        <Link
          href="/admin/products"
          className="rounded-2xl bg-white p-6 shadow-sm border border-[var(--color-border)] hover:shadow-md transition-shadow"
        >
          <h3 className="font-semibold text-[var(--color-text-primary)] mb-2">
            Manage Products
          </h3>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Add, edit, or remove products from your catalog
          </p>
        </Link>

        <Link
          href="/admin/orders"
          className="rounded-2xl bg-white p-6 shadow-sm border border-[var(--color-border)] hover:shadow-md transition-shadow"
        >
          <h3 className="font-semibold text-[var(--color-text-primary)] mb-2">
            View Orders
          </h3>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Track and manage customer orders
          </p>
        </Link>
      </div>
    </div>
  );
}
