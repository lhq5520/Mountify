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
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useCart } from "@/app/context/CartContext";
import { useSession, signIn, signOut } from "next-auth/react";

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const { cart } = useCart();
  const { data: session, status } = useSession();

  const accountRef = useRef<HTMLDivElement | null>(null);

  // Calculate cart item count
  const cartItemCount = cart.reduce((total, item) => total + item.quantity, 0);

  const displayName =
    session?.user?.name || session?.user?.email?.split("@")[0] || "Account";

  // Close account dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        accountRef.current &&
        !accountRef.current.contains(e.target as Node)
      ) {
        setAccountOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <nav className="bg-white/95 backdrop-blur border-b border-[var(--color-border)] sticky top-0 z-50">
      <div className="container-custom">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            href="/"
            className="text-2xl font-semibold text-[var(--color-text-primary)] tracking-tight hover:text-[var(--color-primary)] transition-colors duration-200"
          >
            Mountify
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {/* Middle Navigation */}
            <Link
              href="/products"
              className="text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors duration-200"
            >
              Products
            </Link>

            {/* Right: Cart + Account (Account on the right) */}
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
                      {/* Top Description */}
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

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden text-[var(--color-text-primary)] p-2 hover:bg-[var(--color-background)] rounded-lg transition-colors duration-150"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-[var(--color-border)] animate-fadeInDown">
            <div className="flex flex-col gap-3">
              <Link
                href="/products"
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] py-1.5 transition-colors duration-200"
              >
                Products
              </Link>

              {/* Cart Mobile */}
              <Link
                href="/cart"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] py-1.5 transition-colors duration-200"
              >
                <ShoppingCart size={18} />
                <span>Cart</span>
                {cartItemCount > 0 && (
                  <span className="ml-auto bg-[var(--color-primary)] text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                    {cartItemCount}
                  </span>
                )}
              </Link>

              {/* Account Mobile */}
              {status === "loading" ? (
                <div className="h-8 w-24 rounded-full bg-[var(--color-background)] animate-pulse" />
              ) : session ? (
                <>
                  <div className="flex items-center gap-2 py-1.5">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-black text-[11px] font-semibold text-white">
                      {displayName.charAt(0).toUpperCase()}
                    </span>
                    <span className="truncate text-sm text-[var(--color-text-secondary)]">
                      {displayName}
                    </span>
                  </div>

                  <Link
                    href="/orders"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] py-1.5 transition-colors duration-200"
                  >
                    <Package size={18} />
                    <span>My orders</span>
                  </Link>

                  <Link
                    href="/settings"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] py-1.5 transition-colors duration-200"
                  >
                    <SettingsIcon size={18} />
                    <span>Settings</span>
                  </Link>

                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      signOut();
                    }}
                    className="flex items-center gap-2 text-sm text-red-500 py-1.5 transition-colors duration-200"
                  >
                    <LogOut size={18} />
                    <span>Sign out</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    signIn();
                  }}
                  className="flex items-center gap-2 text-sm font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] py-1.5 transition-colors duration-200"
                >
                  <User size={18} />
                  <span>Sign in</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
