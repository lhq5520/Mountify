"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ImageUploader from "@/app/components/ImageUploader";

// Product image type definition
interface ProductImage {
  url: string;
  publicId: string;
  displayOrder: number;
  isPrimary: boolean;
}

export default function NewProductPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [detailedDescription, setDetailedDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageUrlHover, setImageUrlHover] = useState("");

  // New: Multiple images state
  const [images, setImages] = useState<ProductImage[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Step 1: Create product
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          price: parseFloat(price),
          description,
          detailedDescription: detailedDescription || description,
          imageUrl,
          imageUrlHover: imageUrlHover || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to create product");
        return;
      }

      const productId = data.product.id;

      // Step 2: Save images if uploaded
      if (images.length > 0) {
        const imagesRes = await fetch(
          `/api/admin/products/${productId}/images`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ images }),
          }
        );

        if (!imagesRes.ok) {
          // Product created but image save failed
          console.error("Failed to save images");
          // Can choose to continue or show warning
        }
      }

      // Success - redirect to products list
      router.push("/admin/products");
    } catch (e) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="bg-gradient-to-b from-[#f5f5f7] to-white min-h-[calc(100vh-64px)]">
      <div className="container-custom py-10 md:py-14 max-w-3xl">
        {/* Back Link */}
        <Link
          href="/admin/products"
          className="inline-flex items-center gap-2 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] mb-6"
        >
          <ArrowLeft size={16} />
          Back to Products
        </Link>

        {/* Header */}
        <header className="mb-8">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-[var(--color-text-primary)]">
            Add New Product
          </h1>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            Fill in the product details below
          </p>
        </header>

        {/* Form Card */}
        <div className="rounded-2xl bg-white shadow-sm border border-[var(--color-border)] p-6 md:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Product Name */}
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                Product Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-lg border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:outline-none transition-colors"
                placeholder="e.g., iPhone 15 Pro"
              />
            </div>

            {/* Price */}
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                Price (USD) *
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]">
                  $
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                  className="w-full pl-8 pr-4 py-3 rounded-lg border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:outline-none transition-colors"
                  placeholder="29.99"
                />
              </div>
            </div>

            {/* Short Description */}
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                Short Description *
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                rows={2}
                className="w-full px-4 py-3 rounded-lg border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:outline-none transition-colors resize-none"
                placeholder="Brief description for product listing"
              />
              <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
                Shown on product cards
              </p>
            </div>

            {/* Detailed Description */}
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                Detailed Description
              </label>
              <textarea
                value={detailedDescription}
                onChange={(e) => setDetailedDescription(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 rounded-lg border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:outline-none transition-colors resize-none"
                placeholder="Full product details (optional, defaults to short description)"
              />
              <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
                Shown on product detail page
              </p>
            </div>

            {/* Main Image URL */}
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                Main Image URL *
              </label>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-lg border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:outline-none transition-colors"
                placeholder="https://images.unsplash.com/..."
              />
              <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
                Primary product image (for product listing)
              </p>
            </div>

            {/* Hover Image URL */}
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                Hover Image URL
              </label>
              <input
                type="url"
                value={imageUrlHover}
                onChange={(e) => setImageUrlHover(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:outline-none transition-colors"
                placeholder="https://images.unsplash.com/... (optional)"
              />
              <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
                Image shown on hover (optional)
              </p>
            </div>

            {/* Multiple image upload - New section */}
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                Product Gallery Images
              </label>
              <ImageUploader images={images} setImages={setImages} />
              <p className="text-xs text-[var(--color-text-tertiary)] mt-2">
                Additional images for product detail page gallery
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            {/* Submit Buttons */}
            <div className="flex gap-3 pt-4 border-t border-[var(--color-border)]">
              <button
                type="button"
                onClick={() => router.push("/admin/products")}
                disabled={loading}
                className="flex-1 px-6 py-3 rounded-lg border border-[var(--color-border)] bg-white text-sm font-medium text-[var(--color-text-secondary)] hover:border-gray-400 hover:text-[var(--color-text-primary)] transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-6 py-3 rounded-lg bg-black text-white text-sm font-medium hover:bg-gray-900 transition-colors disabled:opacity-50"
              >
                {loading ? "Creating..." : "Create Product"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
