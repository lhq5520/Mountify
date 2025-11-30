"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useCart } from "@/app/context/CartContext";

interface Product {
  id: number;
  name: string;
  priceCad: number;
  description: string;
  detailed_description: string;
  image_url: string;
  image_url_hover: string;
}

export default function ProductDetailPage() {
  const { id } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();

  useEffect(() => {
    if (!id) return;

    const fetchProduct = async () => {
      try {
        const res = await fetch("/api/products");
        if (!res.ok) throw new Error("Failed to fetch products");
        const data = await res.json();
        const found = (data.products as Product[]).find(
          (p) => p.id === Number(id)
        );
        setProduct(found ?? null);
      } catch (err) {
        console.error(err);
        setProduct(null);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  // Loading skeleton
  if (loading) {
    return (
      <main className="bg-gradient-to-b from-[#f5f5f7] to-white min-h-[calc(100vh-64px)]">
        <div className="container-custom py-10 md:py-14">
          <div className="mb-6">
            <div className="h-4 w-24 rounded bg-gray-200 mb-3" />
            <div className="h-7 w-64 rounded bg-gray-200" />
          </div>
          <div className="grid gap-8 md:grid-cols-2">
            <div className="aspect-[4/5] w-full rounded-2xl bg-gray-200" />
            <div className="space-y-4">
              <div className="h-4 w-1/2 rounded bg-gray-200" />
              <div className="h-4 w-3/4 rounded bg-gray-200" />
              <div className="h-4 w-2/3 rounded bg-gray-200" />
              <div className="h-10 w-40 rounded-full bg-gray-200 mt-4" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Not found
  if (!product) {
    return (
      <main className="bg-gradient-to-b from-[#f5f5f7] to-white min-h-[calc(100vh-64px)]">
        <div className="container-custom py-10 md:py-14">
          <Link
            href="/products"
            className="inline-flex items-center text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
          >
            ← Back to products
          </Link>
          <p className="mt-6 text-sm text-[var(--color-text-secondary)]">
            Product not found.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="bg-gradient-to-b from-[#f5f5f7] to-white min-h-[calc(100vh-64px)]">
      <div className="container-custom py-10 md:py-14">
        {/* back link */}
        <Link
          href="/products"
          className="inline-flex items-center text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
        >
          ← Back to products
        </Link>

        <div className="mt-6 grid gap-10 md:grid-cols-2">
          {/* Left: product image */}
          <div className="relative w-full overflow-hidden rounded-2xl bg-[#f1f2f4]">
            <div className="relative aspect-[4/5]">
              <Image
                src={product.image_url}
                alt={product.name}
                fill
                sizes="(min-width: 1280px) 40vw, (min-width: 768px) 50vw, 100vw"
                className="object-cover"
              />
            </div>
            {product.image_url_hover && (
              <div className="absolute bottom-3 right-3 rounded-full bg-black/70 px-3 py-1 text-[10px] text-white">
                Hover image available on listing
              </div>
            )}
          </div>

          {/* Right: details */}
          <div className="flex flex-col">
            <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-text-tertiary)] mb-2">
              Product detail
            </p>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-[var(--color-text-primary)]">
              {product.name}
            </h1>

            <p className="mt-3 text-sm text-[var(--color-text-secondary)] leading-relaxed">
              {product.description}
            </p>

            <p className="mt-5 text-xl font-semibold text-[var(--color-text-primary)]">
              ${product.priceCad.toFixed(2)}{" "}
              <span className="text-sm font-normal text-[var(--color-text-secondary)]">
                CAD
              </span>
            </p>

            {/* Add to cart section */}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                onClick={() => {
                  addToCart(product);
                  // Simple alert for now, can replace with toast later
                  alert("Added to cart");
                }}
                className="inline-flex items-center justify-center rounded-full bg-black px-6 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-gray-900"
              >
                Add to Cart
              </button>

              <Link
                href="/cart"
                className="inline-flex items-center justify-center rounded-full border border-[var(--color-border)] bg-white px-5 py-2 text-sm font-medium text-[var(--color-text-secondary)] hover:border-gray-400 hover:text-[var(--color-text-primary)]"
              >
                Go to Cart
              </Link>
            </div>

            {/* Note text */}
            <p className="mt-3 text-xs text-[var(--color-text-tertiary)]">
              Free returns within 30 days. Taxes and shipping calculated at
              checkout.
            </p>

            {/* Detailed description - lighter, more ecommerce style */}
            {product.detailed_description && (
              <section className="mt-8 max-w-prose border-t border-[var(--color-border)] pt-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-tertiary)]">
                  Details
                </p>

                <div className="mt-3 space-y-3 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                  {product.detailed_description
                    .split(/\n{2,}|\r?\n/)
                    .filter(Boolean)
                    .map((para, idx) => (
                      <p key={idx} className="whitespace-pre-line">
                        {para}
                      </p>
                    ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
