"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useCart } from "@/app/context/CartContext";
import ImageGallery from "@/app/components/ImageGallery";

interface Product {
  id: number;
  name: string;
  price: number;
  description: string;
  detailed_description: string;
  image_url: string;
  image_url_hover: string;
}

interface ProductImage {
  url: string;
  publicId: string;
  displayOrder: number;
  isPrimary: boolean;
}

export default function ProductDetailPage() {
  const { id } = useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();

  // Quantity
  const [qty, setQty] = useState(1);

  // Add multiple items (keep CartContext untouched)
  function handleAddToCart(count: number) {
    if (!product) return;
    const safe = Math.max(1, Math.min(99, count));
    for (let i = 0; i < safe; i++) addToCart(product);
  }

  useEffect(() => {
    if (!id) return;

    const fetchProduct = async () => {
      try {
        // Fetch individual product using new API
        const res = await fetch(`/api/products/${id}`);
        if (!res.ok) throw new Error("Failed to fetch product");

        const data = await res.json();
        setProduct(data.product);
        setImages(data.images || []);
      } catch (err) {
        console.error(err);
        setProduct(null);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  // Parse detailed description (always render everything)
  const detailParas = useMemo(() => {
    if (!product?.detailed_description) return [];
    return product.detailed_description
      .split(/\n{2,}|\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
  }, [product?.detailed_description]);

  // Build fallback gallery
  const galleryImages: ProductImage[] =
    images.length > 0
      ? images
      : product?.image_url
      ? [
          {
            url: product.image_url,
            publicId: `fallback-${product.id}`,
            displayOrder: 0,
            isPrimary: true,
          },
        ]
      : [];

  if (loading) return null;
  if (!product) return null;

  return (
    <main className="bg-gradient-to-b from-[#f5f5f7] to-white min-h-[calc(100vh-64px)]">
      <div className="container-custom py-10 md:py-14">
        {/* Back link */}
        <Link
          href="/products"
          className="inline-flex items-center text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
        >
          ← Back to products
        </Link>

        <div className="mt-6 grid min-w-0 gap-10 md:grid-cols-2">
          {/* Left: Image */}
          <div className="min-w-0 w-full overflow-hidden">
            <ImageGallery images={galleryImages} productName={product.name} />
          </div>

          {/* Right: Details */}
          <div className="min-w-0 flex flex-col">
            <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-text-tertiary)] mb-2">
              Product detail
            </p>

            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
              {product.name}
            </h1>

            <p className="mt-3 text-sm text-[var(--color-text-secondary)]">
              {product.description}
            </p>

            <p className="mt-5 text-xl font-semibold">
              ${product.price.toFixed(2)}
            </p>

            {/* Quantity */}
            <div className="mt-6">
              <p className="mb-2 text-sm font-medium text-[var(--color-text-secondary)]">
                Quantity
              </p>

              <div className="inline-flex items-center rounded-2xl border border-[var(--color-border)] bg-white px-2">
                <button
                  onClick={() => setQty((v) => Math.max(1, v - 1))}
                  className="h-10 w-10 text-lg text-gray-500"
                >
                  −
                </button>

                <input
                  value={qty}
                  onChange={(e) =>
                    setQty(
                      Math.max(1, Math.min(99, Number(e.target.value) || 1))
                    )
                  }
                  inputMode="numeric"
                  className="w-10 text-center text-sm font-semibold outline-none"
                />

                <button
                  onClick={() => setQty((v) => Math.min(99, v + 1))}
                  className="h-10 w-10 text-lg text-gray-500"
                >
                  +
                </button>
              </div>
            </div>

            {/* Desktop buttons */}
            <div className="mt-6 hidden sm:flex gap-3">
              <button
                onClick={() => handleAddToCart(qty)}
                className="rounded-2xl bg-black px-6 py-3 text-sm font-semibold text-white"
              >
                Add to Cart
              </button>

              <Link
                href="/cart"
                className="rounded-2xl border px-6 py-3 text-sm font-semibold"
              >
                Go to Cart
              </Link>
            </div>

            <p className="mt-4 text-xs text-[var(--color-text-tertiary)]">
              Free returns within 30 days. Taxes and shipping calculated at
              checkout.
            </p>

            {/* Details */}
            {detailParas.length > 0 && (
              <section className="mt-8 border-t pt-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-tertiary)]">
                  Details
                </p>

                <div className="mt-3 space-y-3 text-sm text-[var(--color-text-secondary)]">
                  {detailParas.map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </div>

      {/* Mobile sticky CTA */}
      <div className="sm:hidden fixed inset-x-0 bottom-0 z-50 border-t bg-white/95 backdrop-blur">
        <div className="container-custom py-3 flex items-center gap-3">
          <div>
            <p className="text-xs text-gray-400">Total</p>
            <p className="text-base font-semibold">
              ${(product.price * qty).toFixed(2)}
            </p>
          </div>

          <button
            onClick={() => handleAddToCart(qty)}
            className="flex-1 rounded-2xl bg-black py-3 text-sm font-semibold text-white"
          >
            Add to Cart
          </button>
        </div>
      </div>

      <div className="sm:hidden h-20" />
    </main>
  );
}
