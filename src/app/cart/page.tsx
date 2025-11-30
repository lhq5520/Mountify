// /cart/page.tsx or /orders/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useCart } from "@/app/context/CartContext";

export default function CartPage() {
  const { cart, removeFromCart, clearCart } = useCart();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const total = cart.reduce(
    (sum, item) => sum + item.priceCad * item.quantity,
    0
  );

  async function handleStripeCheckout() {
    if (cart.length === 0) {
      setMessage("Your cart is empty.");
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: "test@example.com", // TODO: replace with real user email
          items: cart.map((item) => ({
            productId: item.id,
            name: item.name,
            quantity: item.quantity,
            priceCad: item.priceCad,
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
      <div className="container-custom py-10 md:py-14">
        {/* Header */}
        <header className="mb-6 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-text-tertiary)]">
              Cart
            </p>
            <h1 className="mt-1 text-2xl md:text-3xl font-semibold tracking-tight text-[var(--color-text-primary)]">
              Shopping Cart
            </h1>
            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
              Review your items before proceeding to checkout.
            </p>
          </div>

          <Link
            href="/products"
            className="mt-3 inline-flex items-center justify-center rounded-full border border-[var(--color-border)] bg-white px-4 py-2 text-xs md:text-sm font-medium text-[var(--color-text-secondary)] hover:border-gray-400 hover:text-[var(--color-text-primary)] md:mt-0"
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
          <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(260px,0.9fr)]">
            {/* Items list */}
            <section className="space-y-4">
              {cart.map((item) => (
                <article
                  key={item.id}
                  className="flex items-start justify-between gap-4 rounded-2xl bg-white px-4 py-4 shadow-sm md:px-5 md:py-5"
                >
                  <div className="flex flex-1 flex-col gap-1">
                    <h2 className="text-sm font-medium text-[var(--color-text-primary)]">
                      {item.name}
                    </h2>
                    <p className="text-xs text-[var(--color-text-secondary)]">
                      Quantity: {item.quantity}
                    </p>
                    <p className="text-xs text-[var(--color-text-secondary)]">
                      Unit price: ${item.priceCad.toFixed(2)} CAD
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                      ${(item.priceCad * item.quantity).toFixed(2)} CAD
                    </p>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      disabled={loading}
                      className="text-xs text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)] disabled:opacity-60"
                    >
                      Remove
                    </button>
                  </div>
                </article>
              ))}
            </section>

            {/* Summary / actions */}
            <aside className="h-fit rounded-2xl bg-white px-5 py-5 shadow-sm">
              <h2 className="text-sm font-semibold text-[var(--color-text-primary)]">
                Order summary
              </h2>

              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="text-[var(--color-text-secondary)]">
                  Subtotal
                </span>
                <span className="font-medium text-[var(--color-text-primary)]">
                  ${total.toFixed(2)} CAD
                </span>
              </div>

              <p className="mt-2 text-[11px] text-[var(--color-text-tertiary)]">
                Taxes and shipping will be calculated at checkout.
              </p>

              <div className="mt-5 flex flex-col gap-3">
                <button
                  onClick={handleStripeCheckout}
                  disabled={loading}
                  className="inline-flex items-center justify-center rounded-full bg-black px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-gray-900 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {loading ? "Processing..." : "Checkout with Stripe"}
                </button>

                <button
                  onClick={clearCart}
                  disabled={loading}
                  className="inline-flex items-center justify-center rounded-full border border-[var(--color-border)] bg-white px-4 py-2 text-xs font-medium text-[var(--color-text-secondary)] hover:border-gray-400 hover:text-[var(--color-text-primary)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Clear cart
                </button>
              </div>

              {message && (
                <p className="mt-4 text-xs text-[var(--color-text-secondary)]">
                  {message}
                </p>
              )}
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}
