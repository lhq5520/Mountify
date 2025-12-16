"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { X } from "lucide-react";

interface Product {
  id: number;
  name: string;
  price: number;
  description: string;
  detailed_description: string;
  image_url: string;
  image_url_hover: string;
}

export default function ProductsPage() {
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get("search") || "";

  const [productList, setProductList] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        let url = "/api/products";

        // If there's a search query, use the search API
        if (searchQuery) {
          url = `/api/products/search?q=${encodeURIComponent(
            searchQuery
          )}&limit=50`;
        }

        const res = await fetch(url);
        if (!res.ok) {
          throw new Error("Failed to fetch products");
        }
        const data = await res.json();

        // Search API returns suggestions, regular API returns products
        if (searchQuery) {
          // Transform search results format
          setProductList(
            (data.suggestions ?? []).map((s: any) => ({
              id: s.id,
              name: s.name,
              price: s.price,
              description: "",
              detailed_description: "",
              image_url: s.imageUrl,
              image_url_hover: "",
            }))
          );
        } else {
          setProductList(data.products ?? []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [searchQuery]);

  return (
    <main className="bg-gradient-to-b from-[#f5f5f7] to-white min-h-[calc(100vh-64px)]">
      <div className="container-custom py-10 md:py-14">
        {/* Header */}
        <header className="mb-8 md:mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-[var(--color-text-primary)]">
              {searchQuery ? "Search Results" : "Products"}
            </h1>

            {/* Search status display */}
            {searchQuery ? (
              <div className="mt-2 flex items-center gap-2">
                <p className="text-sm text-[var(--color-text-secondary)]">
                  {loading
                    ? "Searching..."
                    : `${productList.length} result${
                        productList.length !== 1 ? "s" : ""
                      } for "${searchQuery}"`}
                </p>
                <Link
                  href="/products"
                  className="inline-flex items-center gap-1 text-sm text-[var(--color-primary)] hover:underline"
                >
                  <X size={14} />
                  Clear
                </Link>
              </div>
            ) : (
              <p className="mt-2 text-sm text-[var(--color-text-secondary)] max-w-xl">
                Curated selection with clean, minimal presentation inspired by
                Myprotein / Verve / Pure Cycles.
              </p>
            )}
          </div>

          {/* Sort button - only show when not searching */}
          {!searchQuery && (
            <div className="flex gap-3 text-sm text-[var(--color-text-secondary)]">
              <button className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-white px-4 py-2 hover:border-gray-400 transition">
                Sort: Featured
                <span className="text-xs">▼</span>
              </button>
            </div>
          )}
        </header>

        {/* Loading skeleton */}
        {loading && (
          <div className="grid gap-6 md:gap-8 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-3 animate-pulse">
                <div className="aspect-[4/5] w-full rounded-2xl bg-gray-200" />
                <div className="h-4 w-3/4 rounded bg-gray-200" />
                <div className="h-4 w-1/2 rounded bg-gray-200" />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && productList.length === 0 && (
          <div className="text-center py-16">
            {searchQuery ? (
              <>
                <p className="text-lg font-medium text-[var(--color-text-primary)] mb-2">
                  No products found for "{searchQuery}"
                </p>
                <p className="text-sm text-[var(--color-text-secondary)] mb-4">
                  Try different keywords or browse all products
                </p>
                <Link
                  href="/products"
                  className="inline-flex items-center gap-2 rounded-full bg-black px-6 py-2.5 text-sm font-medium text-white hover:bg-gray-900 transition"
                >
                  View All Products
                </Link>
              </>
            ) : (
              <p className="text-sm text-[var(--color-text-secondary)]">
                No products available yet.
              </p>
            )}
          </div>
        )}

        {/* Product grid */}
        {!loading && productList.length > 0 && (
          <section className="grid gap-6 md:gap-8 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {productList.map((product) => (
              <article key={product.id} className="group flex flex-col">
                {/* Image area */}
                <Link
                  href={`/products/${product.id}`}
                  className="relative w-full overflow-hidden rounded-2xl bg-[#f1f2f4]"
                >
                  <div className="relative aspect-[4/5]">
                    {/* Main image */}
                    <Image
                      src={product.image_url}
                      alt={product.name}
                      fill
                      sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw"
                      className="object-cover transition-opacity duration-300 group-hover:opacity-0"
                    />

                    {/* Hover image */}
                    {product.image_url_hover && (
                      <Image
                        src={product.image_url_hover}
                        alt={`${product.name} hover`}
                        fill
                        sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw"
                        className="object-cover opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                      />
                    )}
                  </div>
                </Link>

                {/* Content area */}
                <div className="mt-3 flex flex-1 flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h2 className="text-sm font-medium text-[var(--color-text-primary)] line-clamp-2">
                        {product.name}
                      </h2>
                    </div>
                    <p className="text-sm font-semibold text-[var(--color-text-primary)] whitespace-nowrap">
                      ${Number(product.price).toFixed(2)}
                    </p>
                  </div>

                  {product.description && (
                    <p className="mt-1 text-xs text-[var(--color-text-secondary)] line-clamp-2">
                      {product.description}
                    </p>
                  )}

                  <Link
                    href={`/products/${product.id}`}
                    className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                  >
                    View details
                    <span aria-hidden>→</span>
                  </Link>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
