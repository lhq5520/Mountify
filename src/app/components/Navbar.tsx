"use client";

import Link from "next/link";
import { ShoppingCart, Menu, X } from "lucide-react";
import { useState } from "react";
import { useCart } from "@/app/context/CartContext";

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { cart } = useCart();

  // Calculate total items in cart
  const cartItemCount = cart.reduce((total, item) => total + item.quantity, 0);

  return (
    <nav className="bg-white/95 backdrop-blur border-b border-[var(--color-border)] sticky top-0 z-50">
      <div className="container-custom">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            href="/"
            className="text-2xl font-semibold text-[var(--color-text-primary)] tracking-tight hover:text-[var(--color-primary)] transition-colors duration-[var(--transition-base)]"
          >
            Mountify
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <Link
              href="/products"
              className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] font-medium transition-colors duration-[var(--transition-base)]"
            >
              Products
            </Link>

            <Link
              href="/cart"
              className="relative flex items-center gap-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors duration-[var(--transition-base)]"
            >
              <ShoppingCart size={24} />
              {cartItemCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-[var(--color-primary)] text-white text-xs font-semibold rounded-full w-5 h-5 flex items-center justify-center animate-scaleIn">
                  {cartItemCount}
                </span>
              )}
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden text-[var(--color-text-primary)] p-2 hover:bg-[var(--color-background)] rounded-lg transition-colors duration-[var(--transition-fast)]"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-[var(--color-border)] animate-fadeInDown">
            <div className="flex flex-col gap-4">
              <Link
                href="/products"
                onClick={() => setMobileMenuOpen(false)}
                className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] font-medium py-2 transition-colors duration-[var(--transition-base)]"
              >
                Products
              </Link>

              <Link
                href="/cart"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] py-2 transition-colors duration-[var(--transition-base)]"
              >
                <ShoppingCart size={20} />
                Cart
                {cartItemCount > 0 && (
                  <span className="bg-[var(--color-primary)] text-white text-xs font-semibold px-2 py-0.5 rounded-full">
                    {cartItemCount}
                  </span>
                )}
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
