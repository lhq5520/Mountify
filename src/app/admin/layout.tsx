"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Package,
  ShoppingCart,
  BarChart3,
  Settings,
  ChevronRight,
  LayoutDashboard,
} from "lucide-react";

const navItems = [
  {
    label: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
  },
  {
    label: "Products",
    href: "/admin/products",
    icon: Package,
  },
  {
    label: "Orders",
    href: "/admin/orders",
    icon: ShoppingCart,
  },
  {
    label: "Analytics",
    href: "/admin/analytics",
    icon: BarChart3,
    comingSoon: true,
  },
  {
    label: "Settings",
    href: "/admin/settings",
    icon: Settings,
    comingSoon: true,
  },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Check if current path matches nav item (handle nested routes)
  function isActive(href: string) {
    if (href === "/admin") {
      return pathname === "/admin";
    }
    return pathname.startsWith(href);
  }

  return (
    <div className="flex min-h-[calc(100vh-64px)]">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-[var(--color-border)] flex-shrink-0 hidden md:block">
        <div className="p-6">
          {/* Admin Header */}
          <div className="mb-8">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-tertiary)]">
              Admin Panel
            </h2>
          </div>

          {/* Navigation */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              if (item.comingSoon) {
                return (
                  <div
                    key={item.href}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[var(--color-text-tertiary)] cursor-not-allowed"
                  >
                    <Icon size={18} />
                    <span className="text-sm">{item.label}</span>
                    <span className="ml-auto text-[10px] bg-gray-100 px-2 py-0.5 rounded-full">
                      Soon
                    </span>
                  </div>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                    active
                      ? "bg-black text-white"
                      : "text-[var(--color-text-secondary)] hover:bg-gray-100 hover:text-[var(--color-text-primary)]"
                  }`}
                >
                  <Icon size={18} />
                  <span className="text-sm font-medium">{item.label}</span>
                  {active && <ChevronRight size={16} className="ml-auto" />}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section */}
        <div className="absolute bottom-0 left-0 w-64 p-6 border-t border-[var(--color-border)]">
          <p className="text-xs text-[var(--color-text-tertiary)]">
            Mountify Admin v1.0
          </p>
        </div>
      </aside>

      {/* Mobile Header (shows on small screens) */}
      <div className="md:hidden fixed top-16 left-0 right-0 z-40 bg-white border-b border-[var(--color-border)] px-4 py-2">
        <div className="flex items-center gap-2 overflow-x-auto">
          {navItems
            .filter((item) => !item.comingSoon)
            .map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
                    active
                      ? "bg-black text-white"
                      : "bg-gray-100 text-[var(--color-text-secondary)]"
                  }`}
                >
                  <Icon size={14} />
                  {item.label}
                </Link>
              );
            })}
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 bg-gradient-to-b from-[#f5f5f7] to-white md:pt-0 pt-12">
        {children}
      </main>
    </div>
  );
}
