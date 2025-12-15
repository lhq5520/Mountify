"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Trash2, Package, Pencil } from "lucide-react";

interface Product {
  id: number;
  name: string;
  price: number;
  description: string;
  detailedDescription?: string;
  imageUrl: string;
  imageUrlHover?: string;
  createdAt: string;
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    try {
      const res = await fetch("/api/admin/products");

      if (!res.ok) {
        throw new Error("Failed to fetch products");
      }

      const data = await res.json();
      setProducts(data.products);
    } catch (e) {
      console.error(e);
      setError("Failed to load products");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(productId: number) {
    setDeleting(true);

    try {
      const res = await fetch(`/api/admin/products/${productId}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Failed to delete product");
        return;
      }

      // Remove from local state
      setProducts((prev) => prev.filter((p) => p.id !== productId));
      setDeleteConfirm(null);
    } catch (e) {
      console.error(e);
      alert("Network error during deletion");
    } finally {
      setDeleting(false);
    }
  }

  // Loading state
  if (loading) {
    return (
      <main className="bg-gradient-to-b from-[#f5f5f7] to-white min-h-[calc(100vh-64px)]">
        <div className="container-custom py-10 md:py-14">
          <div className="h-8 w-48 rounded bg-gray-200 animate-pulse mb-8" />
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-20 rounded-2xl bg-gray-200 animate-pulse"
              />
            ))}
          </div>
        </div>
      </main>
    );
  }

  return (
    <div>
      <div className="container-custom py-10 md:py-14">
        {/* Header */}
        <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Package
                size={20}
                className="text-[var(--color-text-secondary)]"
              />
              <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--color-text-tertiary)]">
                Admin Panel
              </p>
            </div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-[var(--color-text-primary)]">
              Product Management
            </h1>
            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
              Manage your product catalog
            </p>
          </div>

          <Link
            href="/admin/products/new"
            className="inline-flex items-center gap-2 justify-center rounded-full bg-black px-6 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-gray-900"
          >
            <Plus size={18} />
            Add New Product
          </Link>
        </header>

        {/* Error State */}
        {error && (
          <div className="rounded-2xl bg-red-50 border border-red-200 px-6 py-4 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Products Table */}
        {products.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--color-border)] bg-white/70 px-6 py-12 text-center">
            <p className="text-sm font-medium text-[var(--color-text-primary)] mb-2">
              No products yet
            </p>
            <p className="text-xs text-[var(--color-text-secondary)] mb-6">
              Add your first product to get started
            </p>
            <Link
              href="/admin/products/new"
              className="inline-flex items-center gap-2 rounded-full bg-black px-6 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-gray-900"
            >
              <Plus size={18} />
              Add Product
            </Link>
          </div>
        ) : (
          <div className="rounded-2xl bg-white shadow-sm border border-[var(--color-border)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-[var(--color-border)]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                      Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {products.map((product) => (
                    <tr
                      key={product.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="w-12 h-12 rounded-lg object-cover bg-gray-100"
                          />
                          <div>
                            <p className="text-sm font-medium text-[var(--color-text-primary)]">
                              {product.name}
                            </p>
                            <p className="text-xs text-[var(--color-text-tertiary)]">
                              ID: {product.id}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-[var(--color-text-primary)]">
                        ${product.price.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-sm text-[var(--color-text-secondary)] max-w-xs truncate">
                        {product.description}
                      </td>
                      <td className="px-6 py-4 text-sm text-[var(--color-text-secondary)]">
                        {new Date(product.createdAt).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          }
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <Link
                            href={`/admin/products/${product.id}/edit`}
                            className="inline-flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                          >
                            <Pencil size={16} />
                            Edit
                          </Link>
                          <button
                            onClick={() => setDeleteConfirm(product.id)}
                            className="inline-flex items-center gap-1.5 text-sm text-red-600 hover:text-red-700 transition-colors"
                            disabled={deleting}
                          >
                            <Trash2 size={16} />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirm !== null && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
              <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
                Delete Product?
              </h3>
              <p className="text-sm text-[var(--color-text-secondary)] mb-6">
                Are you sure you want to delete this product? This action cannot
                be undone.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  disabled={deleting}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-[var(--color-text-secondary)] hover:bg-gray-100 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm)}
                  disabled={deleting}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {deleting ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
