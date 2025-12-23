"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/app/context/CartContext";
import { useSession } from "next-auth/react";
import { Mail, Check, Minus, Plus, Trash2 } from "lucide-react";

export default function CartPage() {
  const { cart, removeFromCart, clearCart, updateQuantity } = useCart();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const { data: session } = useSession();

  // Guest email state
  const [guestEmail, setGuestEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Helper to get image URL (handles both snake_case and camelCase)
  const getImageUrl = (item: any): string | undefined => {
    return item.image_url || item.imageUrl;
  };

  // Validate email format
  function validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  async function handleStripeCheckout() {
    if (cart.length === 0) {
      setMessage("Your cart is empty.");
      return;
    }

    // If not logged in, validate guest email
    if (!session) {
      if (!guestEmail) {
        setEmailError("Email is required for checkout");
        return;
      }

      if (!validateEmail(guestEmail)) {
        setEmailError("Please enter a valid email address");
        return;
      }
    }

    setLoading(true);
    setMessage(null);
    setEmailError(null);

    try {
      const emailToUse = session?.user?.email || guestEmail;

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: emailToUse,
          items: cart.map((item) => ({
            productId: item.id,
            quantity: item.quantity,
          })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.error || "Failed to create order.");
        return;
      }

      window.location.href = data.url;
    } catch (e) {
      console.error(e);
      setMessage("Network error during checkout.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="bg-gradient-to-b from-[#f5f5f7] to-white min-h-[calc(100vh-64px)]">
      <div className="container-custom py-6 md:py-14">
        {/* Header */}
        <header className="mb-5 md:mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[10px] md:text-[11px] uppercase tracking-[0.16em] text-[var(--color-text-tertiary)]">
              Cart
            </p>
            <h1 className="mt-1 text-xl md:text-3xl font-semibold tracking-tight text-[var(--color-text-primary)]">
              Shopping Cart
              {itemCount > 0 && (
                <span className="ml-2 text-base md:text-xl font-normal text-[var(--color-text-tertiary)]">
                  ({itemCount} {itemCount === 1 ? "item" : "items"})
                </span>
              )}
            </h1>
          </div>

          <Link
            href="/products"
            className="hidden md:inline-flex items-center justify-center rounded-full border border-[var(--color-border)] bg-white px-4 py-2 text-sm font-medium text-[var(--color-text-secondary)] hover:border-gray-400 hover:text-[var(--color-text-primary)]"
          >
            Continue shopping →
          </Link>
        </header>

        {/* Empty state */}
        {cart.length === 0 && (
          <section className="mt-6 rounded-2xl border border-dashed border-[var(--color-border)] bg-white/70 px-6 py-10 text-center">
            <p className="text-sm font-medium text-[var(--color-text-primary)]">
              Your cart is currently empty.
            </p>
            <p className="mt-2 text-xs text-[var(--color-text-secondary)]">
              Add products from the store and they will appear here.
            </p>
            <Link
              href="/products"
              className="mt-5 inline-flex items-center justify-center rounded-full bg-black px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-gray-900"
            >
              Browse products
            </Link>
          </section>
        )}

        {/* Cart content */}
        {cart.length > 0 && (
          <div className="mt-4 md:mt-6 flex flex-col lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(260px,0.9fr)] gap-4 md:gap-8">
            {/* Items list */}
            <section className="space-y-3 md:space-y-4">
              {cart.map((item) => (
                <article
                  key={item.id}
                  className="flex gap-3 md:gap-4 rounded-xl md:rounded-2xl bg-white p-3 md:px-5 md:py-5 shadow-sm"
                >
                  {/* Product Image */}
                  <Link
                    href={`/products/${item.id}`}
                    className="relative flex-shrink-0 w-20 h-20 md:w-24 md:h-24 rounded-lg md:rounded-xl overflow-hidden bg-[#f1f2f4]"
                  >
                    {getImageUrl(item) ? (
                      <Image
                        src={getImageUrl(item)!}
                        alt={item.name}
                        fill
                        sizes="96px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[var(--color-text-tertiary)]">
                        <span className="text-2xl">📦</span>
                      </div>
                    )}
                  </Link>

                  {/* Product Info */}
                  <div className="flex-1 min-w-0 flex flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        href={`/products/${item.id}`}
                        className="text-sm md:text-base font-medium text-[var(--color-text-primary)] line-clamp-2 hover:underline"
                      >
                        {item.name}
                      </Link>
                      {/* Desktop price */}
                      <p className="hidden md:block text-sm font-semibold text-[var(--color-text-primary)] whitespace-nowrap">
                        ${(item.price * item.quantity).toFixed(2)}
                      </p>
                    </div>

                    <p className="text-[11px] md:text-xs text-[var(--color-text-tertiary)] mt-0.5">
                      ${item.price.toFixed(2)} each
                    </p>

                    {/* Mobile: Price + Controls row */}
                    <div className="mt-auto pt-2 flex items-center justify-between">
                      {/* Quantity Controls */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() =>
                            updateQuantity(
                              item.id,
                              Math.max(1, item.quantity - 1)
                            )
                          }
                          disabled={loading || item.quantity <= 1}
                          className="w-7 h-7 md:w-8 md:h-8 flex items-center justify-center rounded-full border border-[var(--color-border)] bg-white text-[var(--color-text-secondary)] hover:border-gray-400 hover:text-[var(--color-text-primary)] disabled:opacity-40 disabled:cursor-not-allowed transition"
                          aria-label="Decrease quantity"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="w-8 text-center text-sm font-medium text-[var(--color-text-primary)]">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() =>
                            updateQuantity(item.id, item.quantity + 1)
                          }
                          disabled={loading}
                          className="w-7 h-7 md:w-8 md:h-8 flex items-center justify-center rounded-full border border-[var(--color-border)] bg-white text-[var(--color-text-secondary)] hover:border-gray-400 hover:text-[var(--color-text-primary)] disabled:opacity-40 transition"
                          aria-label="Increase quantity"
                        >
                          <Plus size={14} />
                        </button>

                        {/* Remove button */}
                        <button
                          onClick={() => removeFromCart(item.id)}
                          disabled={loading}
                          className="ml-2 w-7 h-7 md:w-8 md:h-8 flex items-center justify-center rounded-full text-[var(--color-text-tertiary)] hover:bg-red-50 hover:text-red-500 disabled:opacity-40 transition"
                          aria-label="Remove item"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      {/* Mobile price */}
                      <p className="md:hidden text-sm font-semibold text-[var(--color-text-primary)]">
                        ${(item.price * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </article>
              ))}

              {/* Mobile: Continue shopping link */}
              <Link
                href="/products"
                className="md:hidden flex items-center justify-center py-3 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              >
                ← Continue shopping
              </Link>
            </section>

            {/* Summary / actions */}
            <aside className="h-fit space-y-3 md:space-y-4">
              {/* Email Section - only show if not logged in */}
              {!session && (
                <div className="rounded-xl md:rounded-2xl bg-white px-4 py-4 md:px-5 md:py-5 shadow-sm border border-[var(--color-border)]">
                  <div className="flex items-center gap-2 mb-2 md:mb-3">
                    <Mail
                      size={16}
                      className="text-[var(--color-text-secondary)]"
                    />
                    <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
                      Contact Information
                    </h3>
                  </div>

                  <p className="text-[11px] md:text-xs text-[var(--color-text-secondary)] mb-2 md:mb-3">
                    We'll send your order confirmation here
                  </p>

                  <input
                    type="email"
                    value={guestEmail}
                    onChange={(e) => {
                      setGuestEmail(e.target.value);
                      setEmailError(null);
                    }}
                    placeholder="you@example.com"
                    className="w-full px-3 md:px-4 py-2.5 rounded-lg text-sm transition-all duration-200"
                    style={{
                      border: emailError
                        ? "1px solid var(--color-error)"
                        : "1px solid var(--color-border)",
                      backgroundColor: "var(--color-surface)",
                      color: "var(--color-text-primary)",
                    }}
                    onFocus={(e) => {
                      if (!emailError) {
                        e.target.style.borderColor = "var(--color-primary)";
                      }
                      e.target.style.outline = "none";
                    }}
                    onBlur={(e) => {
                      if (!emailError) {
                        e.target.style.borderColor = "var(--color-border)";
                      }
                    }}
                  />

                  {emailError && (
                    <p className="text-xs text-[var(--color-error)] mt-2">
                      {emailError}
                    </p>
                  )}

                  <p className="text-[10px] text-[var(--color-text-tertiary)] mt-2 md:mt-3">
                    Or{" "}
                    <Link
                      href="/auth/signin"
                      className="text-[var(--color-primary)] hover:underline"
                    >
                      sign in
                    </Link>{" "}
                    to save your order history
                  </p>
                </div>
              )}

              {/* Show logged in user email */}
              {session && (
                <div className="rounded-xl md:rounded-2xl bg-white px-4 py-3 md:px-5 md:py-4 shadow-sm border border-[var(--color-border)]">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 md:h-8 md:w-8 items-center justify-center rounded-full bg-green-100">
                      <Check size={14} className="text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] md:text-xs text-[var(--color-text-tertiary)]">
                        Signed in as
                      </p>
                      <p className="text-xs md:text-sm font-medium text-[var(--color-text-primary)] truncate">
                        {session.user?.email}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Order Summary */}
              <div className="rounded-xl md:rounded-2xl bg-white px-4 py-4 md:px-5 md:py-5 shadow-sm">
                <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
                  Order summary
                </h2>

                <div className="mt-3 md:mt-4 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--color-text-secondary)]">
                      Subtotal ({itemCount} {itemCount === 1 ? "item" : "items"}
                      )
                    </span>
                    <span className="font-medium text-[var(--color-text-primary)]">
                      ${total.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--color-text-secondary)]">
                      Shipping
                    </span>
                    <span className="text-[var(--color-text-tertiary)]">
                      Calculated at checkout
                    </span>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-[var(--color-border)] flex items-center justify-between">
                  <span className="text-sm font-medium text-[var(--color-text-primary)]">
                    Total
                  </span>
                  <span className="text-base md:text-lg font-semibold text-[var(--color-text-primary)]">
                    ${total.toFixed(2)} USD
                  </span>
                </div>

                <div className="mt-4 md:mt-5 flex flex-col gap-2 md:gap-3">
                  <button
                    onClick={handleStripeCheckout}
                    disabled={loading}
                    className="w-full inline-flex items-center justify-center rounded-full bg-black px-4 py-2.5 md:py-3 text-sm font-medium text-white shadow-sm transition hover:bg-gray-900 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {loading ? "Processing..." : "Checkout"}
                  </button>

                  <button
                    onClick={clearCart}
                    disabled={loading}
                    className="w-full inline-flex items-center justify-center rounded-full border border-[var(--color-border)] bg-white px-4 py-2 text-xs font-medium text-[var(--color-text-secondary)] hover:border-gray-400 hover:text-[var(--color-text-primary)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Clear cart
                  </button>
                </div>

                {message && (
                  <p className="mt-3 md:mt-4 text-xs text-[var(--color-text-secondary)]">
                    {message}
                  </p>
                )}
              </div>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}
