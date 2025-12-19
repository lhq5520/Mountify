"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { X, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

interface Product {
  id: number;
  name: string;
  price: number;
  description: string;
  image_url: string;
  image_url_hover: string;
  category_name?: string;
  category_slug?: string;
}

interface Category {
  id: number;
  name: string;
  slug: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "name", label: "Name: A-Z" },
];

export default function ProductsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Read from URL
  const searchQuery = searchParams.get("search") || "";
  const currentCategory = searchParams.get("category") || "all";
  const currentSort = searchParams.get("sort") || "newest";
  const currentPage = parseInt(searchParams.get("page") || "1", 10);

  // State
  const [productList, setProductList] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [stockMap, setStockMap] = useState<Record<string, number>>({});

  // Dropdown states
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  // Fetch categories on mount
  useEffect(() => {
    fetch("/api/categories")
      .then((res) => res.json())
      .then((data) => setCategories(data.categories || []))
      .catch((e) => console.error("Failed to load categories:", e));
  }, []);

  // Fetch products when filters change
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        // Build URL with all parameters
        const params = new URLSearchParams();

        if (searchQuery) {
          params.set("search", searchQuery);
        }
        if (currentCategory && currentCategory !== "all") {
          params.set("category", currentCategory);
        }
        if (currentSort && currentSort !== "newest") {
          params.set("sort", currentSort);
        }
        if (currentPage > 1) {
          params.set("page", currentPage.toString());
        }
        params.set("limit", "12");

        const url = `/api/products${
          params.toString() ? `?${params.toString()}` : ""
        }`;
        const res = await fetch(url);

        if (!res.ok) throw new Error("Failed to fetch products");

        const data = await res.json();
        setProductList(data.products ?? []);
        setPagination(data.pagination ?? null);

        // Fetch inventory
        try {
          const invRes = await fetch("/api/inventory");
          if (invRes.ok) {
            const invData = await invRes.json();
            setStockMap(invData.inventory || {});
          }
        } catch (e) {
          console.error("Failed to fetch inventory:", e);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [searchQuery, currentCategory, currentSort, currentPage]);

  // Update URL when filters change
  function updateFilters(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(updates).forEach(([key, value]) => {
      if (
        value === null ||
        value === "" ||
        value === "all" ||
        (key === "sort" && value === "newest") ||
        (key === "page" && value === "1")
      ) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });

    // Reset page when changing filters (except when changing page itself)
    if (!("page" in updates)) {
      params.delete("page");
    }

    router.push(`/products${params.toString() ? `?${params.toString()}` : ""}`);
  }

  // Get current labels
  const currentCategoryLabel =
    categories.find((c) => c.slug === currentCategory)?.name || "All Products";
  const currentSortLabel =
    SORT_OPTIONS.find((s) => s.value === currentSort)?.label || "Newest";

  return (
    <main className="bg-gradient-to-b from-[#f5f5f7] to-white min-h-[calc(100vh-64px)]">
      <div className="container-custom py-10 md:py-14">
        {/* Header */}
        <header className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-[var(--color-text-primary)]">
            {searchQuery ? "Search Results" : "Products"}
          </h1>

          {searchQuery && (
            <div className="mt-2 flex items-center gap-2">
              <p className="text-sm text-[var(--color-text-secondary)]">
                {loading
                  ? "Searching..."
                  : `${pagination?.total || productList.length} result${
                      (pagination?.total || productList.length) !== 1 ? "s" : ""
                    } for "${searchQuery}"`}
              </p>
              <button
                onClick={() => updateFilters({ search: null })}
                className="inline-flex items-center gap-1 text-sm text-[var(--color-primary)] hover:underline"
              >
                <X size={14} />
                Clear
              </button>
            </div>
          )}
        </header>

        {/* Filters Bar */}
        <div className="mb-6 md:mb-8 flex flex-wrap items-center gap-3">
          {/* Category Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setShowCategoryDropdown(!showCategoryDropdown);
                setShowSortDropdown(false);
              }}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-white px-4 py-2 text-sm hover:border-gray-400 transition"
            >
              <span className="text-[var(--color-text-secondary)]">
                Category:
              </span>
              <span className="font-medium text-[var(--color-text-primary)]">
                {currentCategoryLabel}
              </span>
              <ChevronDown
                size={16}
                className="text-[var(--color-text-tertiary)]"
              />
            </button>

            {showCategoryDropdown && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowCategoryDropdown(false)}
                />
                <div className="absolute top-full left-0 mt-2 z-20 min-w-[180px] rounded-xl border border-[var(--color-border)] bg-white shadow-lg py-2">
                  <button
                    onClick={() => {
                      updateFilters({ category: "all" });
                      setShowCategoryDropdown(false);
                    }}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition ${
                      currentCategory === "all"
                        ? "font-medium text-[var(--color-primary)]"
                        : "text-[var(--color-text-primary)]"
                    }`}
                  >
                    All Products
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => {
                        updateFilters({ category: cat.slug });
                        setShowCategoryDropdown(false);
                      }}
                      className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition ${
                        currentCategory === cat.slug
                          ? "font-medium text-[var(--color-primary)]"
                          : "text-[var(--color-text-primary)]"
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Sort Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setShowSortDropdown(!showSortDropdown);
                setShowCategoryDropdown(false);
              }}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-white px-4 py-2 text-sm hover:border-gray-400 transition"
            >
              <span className="text-[var(--color-text-secondary)]">Sort:</span>
              <span className="font-medium text-[var(--color-text-primary)]">
                {currentSortLabel}
              </span>
              <ChevronDown
                size={16}
                className="text-[var(--color-text-tertiary)]"
              />
            </button>

            {showSortDropdown && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowSortDropdown(false)}
                />
                <div className="absolute top-full left-0 mt-2 z-20 min-w-[180px] rounded-xl border border-[var(--color-border)] bg-white shadow-lg py-2">
                  {SORT_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        updateFilters({ sort: option.value });
                        setShowSortDropdown(false);
                      }}
                      className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition ${
                        currentSort === option.value
                          ? "font-medium text-[var(--color-primary)]"
                          : "text-[var(--color-text-primary)]"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Results count */}
          {!loading && pagination && (
            <span className="text-sm text-[var(--color-text-tertiary)] ml-auto">
              {pagination.total} product{pagination.total !== 1 ? "s" : ""}
            </span>
          )}
        </div>

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
            <p className="text-lg font-medium text-[var(--color-text-primary)] mb-2">
              No products found
            </p>
            <p className="text-sm text-[var(--color-text-secondary)] mb-4">
              Try adjusting your filters or browse all products
            </p>
            <button
              onClick={() => router.push("/products")}
              className="inline-flex items-center gap-2 rounded-full bg-black px-6 py-2.5 text-sm font-medium text-white hover:bg-gray-900 transition"
            >
              View All Products
            </button>
          </div>
        )}

        {/* Product grid */}
        {!loading && productList.length > 0 && (
          <section className="grid gap-6 md:gap-8 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {productList.map((product) => (
              <article key={product.id} className="group flex flex-col">
                <Link
                  href={`/products/${product.id}`}
                  className="relative w-full overflow-hidden rounded-2xl bg-[#f1f2f4]"
                >
                  <div className="relative aspect-[4/5]">
                    <Image
                      src={product.image_url}
                      alt={product.name}
                      fill
                      sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw"
                      className="object-cover transition-opacity duration-300 group-hover:opacity-0"
                    />
                    {product.image_url_hover && (
                      <Image
                        src={product.image_url_hover}
                        alt={`${product.name} hover`}
                        fill
                        sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw"
                        className="object-cover opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                      />
                    )}

                    {/* Stock badges */}
                    {stockMap[String(product.id)] === 0 && (
                      <div className="absolute top-3 left-3 bg-red-500 text-white text-xs font-medium px-2 py-1 rounded-full">
                        Out of Stock
                      </div>
                    )}
                    {stockMap[String(product.id)] > 0 &&
                      stockMap[String(product.id)] <= 5 && (
                        <div className="absolute top-3 left-3 bg-orange-500 text-white text-xs font-medium px-2 py-1 rounded-full">
                          Low Stock
                        </div>
                      )}
                  </div>
                </Link>

                <div className="mt-3 flex flex-1 flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h2 className="text-sm font-medium text-[var(--color-text-primary)] line-clamp-2">
                        {product.name}
                      </h2>
                      {product.category_name && (
                        <p className="text-xs text-[var(--color-text-tertiary)] mt-0.5">
                          {product.category_name}
                        </p>
                      )}
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

        {/* Pagination */}
        {!loading && pagination && pagination.totalPages > 1 && (
          <div className="mt-10 flex items-center justify-center gap-2">
            <button
              onClick={() =>
                updateFilters({ page: (currentPage - 1).toString() })
              }
              disabled={currentPage <= 1}
              className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-white px-4 py-2 text-sm hover:border-gray-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={16} />
              Previous
            </button>

            <span className="px-4 text-sm text-[var(--color-text-secondary)]">
              Page {currentPage} of {pagination.totalPages}
            </span>

            <button
              onClick={() =>
                updateFilters({ page: (currentPage + 1).toString() })
              }
              disabled={!pagination.hasMore}
              className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-white px-4 py-2 text-sm hover:border-gray-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
