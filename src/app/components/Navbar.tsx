"use client";
import Link from "next/link";
import {
  ShoppingCart,
  Menu,
  X,
  User,
  ChevronDown,
  LogOut,
  Settings as SettingsIcon,
  Package,
  Shield,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useCart } from "@/app/context/CartContext";
import { useSession, signIn, signOut } from "next-auth/react";
import SearchBar from "@/app/components/SearchBar";

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileAccountOpen, setMobileAccountOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const { cart } = useCart();
  const { data: session, status } = useSession();

  const accountRef = useRef<HTMLDivElement | null>(null);
  const mobileAccountRef = useRef<HTMLDivElement | null>(null);

  // Calculate cart item count
  const cartItemCount = cart.reduce((total, item) => total + item.quantity, 0);

  const displayName =
    session?.user?.name || session?.user?.email?.split("@")[0] || "Account";

  // Check if the user is admin
  const isAdmin = session?.user?.role === "admin";

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        accountRef.current &&
        !accountRef.current.contains(e.target as Node)
      ) {
        setAccountOpen(false);
      }
      if (
        mobileAccountRef.current &&
        !mobileAccountRef.current.contains(e.target as Node)
      ) {
        setMobileAccountOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close mobile account menu when hamburger opens
  useEffect(() => {
    if (mobileMenuOpen) {
      setMobileAccountOpen(false);
    }
  }, [mobileMenuOpen]);

  // Close hamburger menu when mobile account opens
  useEffect(() => {
    if (mobileAccountOpen) {
      setMobileMenuOpen(false);
    }
  }, [mobileAccountOpen]);

  return (
    <nav className="bg-white/95 backdrop-blur border-b border-[var(--color-border)] sticky top-0 z-50">
      <div className="container-custom">
        <div className="flex items-center justify-between h-16">
          {/* Left: Mobile Hamburger / Desktop Logo */}
          <div className="flex items-center">
            {/* Mobile: Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden text-[var(--color-text-primary)] p-2 -ml-2 hover:bg-[var(--color-background)] rounded-lg transition-colors duration-150"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            {/* Desktop: Logo */}
            <Link
              href="/"
              className="hidden md:block text-2xl font-semibold text-[var(--color-text-primary)] tracking-tight hover:text-[var(--color-primary)] transition-colors duration-200"
            >
              Mountify
            </Link>
          </div>

          {/* Center: Mobile Logo */}
          <Link
            href="/"
            className="md:hidden text-xl font-semibold text-[var(--color-text-primary)] tracking-tight"
          >
            Mountify
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {/* Search Bar */}
            <SearchBar className="w-64" placeholder="Search..." />

            {/* Navigation Link */}
            <Link
              href="/products"
              className="text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors duration-200"
            >
              Products
            </Link>

            {/* Right: Account + Cart */}
            <div className="flex items-center gap-5">
              {/* Account / Auth */}
              {status === "loading" ? (
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-[var(--color-background)] animate-pulse" />
                  <div className="h-3 w-16 rounded bg-[var(--color-background)] animate-pulse" />
                </div>
              ) : session ? (
                // Logged in: Avatar + Dropdown Menu
                <div className="relative" ref={accountRef}>
                  <button
                    onClick={() => setAccountOpen((open) => !open)}
                    className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 h-9 text-xs font-medium text-[var(--color-text-secondary)] hover:border-gray-400 hover:text-[var(--color-text-primary)] transition-colors duration-200"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-black text-[11px] font-semibold text-white">
                      {displayName.charAt(0).toUpperCase()}
                    </span>
                    <span className="max-w-[110px] truncate">
                      {displayName}
                    </span>
                    <ChevronDown size={14} />
                  </button>

                  {accountOpen && (
                    <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-[var(--color-border)] bg-white shadow-lg overflow-hidden">
                      {/* User Info */}
                      <div className="px-4 py-3 border-b border-[var(--color-border)]">
                        <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-text-tertiary)]">
                          Signed in as
                        </p>
                        <p className="mt-1 text-sm font-medium text-[var(--color-text-primary)] truncate">
                          {session.user?.email || displayName}
                        </p>
                      </div>

                      {/* Menu Items */}
                      <div className="py-1">
                        <Link
                          href="/orders"
                          className="flex items-center gap-2 px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-background)] hover:text-[var(--color-text-primary)] transition-colors duration-150"
                          onClick={() => setAccountOpen(false)}
                        >
                          <Package size={16} />
                          <span>My orders</span>
                        </Link>

                        <Link
                          href="/settings"
                          className="flex items-center gap-2 px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-background)] hover:text-[var(--color-text-primary)] transition-colors duration-150"
                          onClick={() => setAccountOpen(false)}
                        >
                          <SettingsIcon size={16} />
                          <span>Settings</span>
                        </Link>

                        {isAdmin && (
                          <Link
                            href="/admin/products"
                            className="flex items-center gap-2 px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-background)] hover:text-[var(--color-text-primary)] transition-colors duration-150"
                            onClick={() => setAccountOpen(false)}
                          >
                            <Shield size={16} />
                            <span>Admin</span>
                          </Link>
                        )}

                        <button
                          onClick={() => {
                            setAccountOpen(false);
                            signOut();
                          }}
                          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-500 hover:bg-red-50 transition-colors duration-150"
                        >
                          <LogOut size={16} />
                          <span>Sign out</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                // Not logged in: Sign in button
                <button
                  onClick={() => signIn()}
                  className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 h-9 text-xs font-medium text-[var(--color-text-secondary)] hover:border-gray-400 hover:text-[var(--color-text-primary)] transition-colors duration-200"
                >
                  <User size={14} />
                  <span>Sign in</span>
                </button>
              )}

              {/* Cart */}
              <Link
                href="/cart"
                className="relative flex items-center gap-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors duration-200"
              >
                <ShoppingCart size={22} />
                {cartItemCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-[var(--color-primary)] text-white text-xs font-semibold rounded-full w-5 h-5 flex items-center justify-center">
                    {cartItemCount}
                  </span>
                )}
              </Link>
            </div>
          </div>

          {/* Right: Mobile Avatar + Cart */}
          <div className="md:hidden flex items-center gap-3">
            {/* Mobile: Account Avatar with Dropdown */}
            {status === "loading" ? (
              <div className="h-7 w-7 rounded-full bg-[var(--color-background)] animate-pulse" />
            ) : session ? (
              <div className="relative" ref={mobileAccountRef}>
                <button
                  onClick={() => setMobileAccountOpen((open) => !open)}
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-black text-[11px] font-semibold text-white"
                  aria-label="Account menu"
                >
                  {displayName.charAt(0).toUpperCase()}
                </button>

                {/* Mobile Account Dropdown */}
                {mobileAccountOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-[var(--color-border)] bg-white shadow-lg overflow-hidden z-50">
                    {/* User Info */}
                    <div className="px-4 py-3 border-b border-[var(--color-border)]">
                      <div className="flex items-center gap-2">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-black text-[11px] font-semibold text-white">
                          {displayName.charAt(0).toUpperCase()}
                        </span>
                        <span className="truncate text-sm font-medium text-[var(--color-text-primary)]">
                          {displayName}
                        </span>
                      </div>
                    </div>

                    {/* Menu Items */}
                    <div className="py-1">
                      <Link
                        href="/orders"
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-background)] hover:text-[var(--color-text-primary)] transition-colors duration-150"
                        onClick={() => setMobileAccountOpen(false)}
                      >
                        <Package size={18} />
                        <span>My orders</span>
                      </Link>

                      <Link
                        href="/settings"
                        className="flex items-center gap-2 px-4 py-2.5 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-background)] hover:text-[var(--color-text-primary)] transition-colors duration-150"
                        onClick={() => setMobileAccountOpen(false)}
                      >
                        <SettingsIcon size={18} />
                        <span>Settings</span>
                      </Link>

                      {isAdmin && (
                        <Link
                          href="/admin/products"
                          className="flex items-center gap-2 px-4 py-2.5 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-background)] hover:text-[var(--color-text-primary)] transition-colors duration-150"
                          onClick={() => setMobileAccountOpen(false)}
                        >
                          <Shield size={18} />
                          <span>Admin</span>
                        </Link>
                      )}

                      <button
                        onClick={() => {
                          setMobileAccountOpen(false);
                          signOut();
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors duration-150"
                      >
                        <LogOut size={18} />
                        <span>Sign out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => signIn()}
                className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors duration-200"
                aria-label="Sign in"
              >
                <User size={22} />
              </button>
            )}

            {/* Mobile: Cart */}
            <Link
              href="/cart"
              className="relative text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors duration-200"
              aria-label="Cart"
            >
              <ShoppingCart size={22} />
              {cartItemCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-[var(--color-primary)] text-white text-xs font-semibold rounded-full w-5 h-5 flex items-center justify-center">
                  {cartItemCount}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Mobile Hamburger Menu - Only Search and Shop All */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-[var(--color-border)] animate-fadeInDown">
            <div className="flex flex-col gap-3">
              {/* Search Bar */}
              <div className="pb-3 border-b border-[var(--color-border)]">
                <SearchBar placeholder="Search products..." />
              </div>

              {/* Shop All Button */}
              <Link
                href="/products"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center gap-1 w-full bg-[var(--color-primary)] text-white text-sm font-semibold rounded-lg py-2 shadow hover:bg-[var(--color-primary-dark)] transition-all duration-200"
                style={{ letterSpacing: "0.01em" }}
              >
                <span>
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M3 6a1 1 0 0 1 1-1h1.22a1 1 0 0 1 .98.8l.3 1.2H21a1 1 0 0 1 .96 1.27l-1.8 7A2 2 0 0 1 18.2 17H8.42a2 2 0 0 1-1.96-1.58L4.34 7.6l-.28-1.12A1 1 0 0 1 3 6Zm5.16 9h9.04a1 1 0 0 0 .98-.8l1.52-5.6H6.16l1.52 5.6a1 1 0 0 0 .98.8ZM7 20a2 2 0 1 1 4 0H7Zm6 0a2 2 0 1 1 4 0h-4Z"
                    />
                  </svg>
                </span>
                <span>Shop All</span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
