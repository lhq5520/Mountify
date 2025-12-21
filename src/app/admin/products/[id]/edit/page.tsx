"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ImageUploader from "@/app/components/ImageUploader";
import SingleImageUploader from "@/app/components/SingleImageUploader";

interface ProductImage {
  url: string;
  publicId: string;
  displayOrder: number;
  isPrimary: boolean;
  isNew: boolean;
}

export default function EditProductPage() {
  const router = useRouter();
  const { id } = useParams();

  // Form state
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [detailedDescription, setDetailedDescription] = useState("");
  const [mainImage, setMainImage] = useState<{
    url: string;
    publicId: string;
    isNew: boolean;
  } | null>(null);
  const [hoverImage, setHoverImage] = useState<{
    url: string;
    publicId: string;
    isNew: boolean;
  } | null>(null);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [categoryId, setCategoryId] = useState<string>("");
  const [categories, setCategories] = useState<{ id: number; name: string }[]>(
    []
  );

  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/categories")
      .then((res) => res.json())
      .then((data) => setCategories(data.categories || []))
      .catch((e) => console.error("Failed to load categories:", e));
  }, []);

  // Load existing product data
  useEffect(() => {
    if (!id) return;

    async function fetchProduct() {
      try {
        const res = await fetch(`/api/products/${id}`);

        if (!res.ok) {
          throw new Error("Failed to fetch product");
        }

        const data = await res.json();
        const product = data.product;

        // Populate form fields
        setName(product.name || "");
        setPrice(product.price?.toString() || "");
        setDescription(product.description || "");
        setDetailedDescription(product.detailedDescription || "");
        if (product.imageUrl && product.imagePublicId) {
          setMainImage({
            url: product.imageUrl,
            publicId: product.imagePublicId,
            isNew: false,
          });
        } else {
          setMainImage(null);
        }

        if (product.imageUrlHover && product.imageHoverPublicId) {
          setHoverImage({
            url: product.imageUrlHover,
            publicId: product.imageHoverPublicId,
            isNew: false,
          });
        } else {
          setHoverImage(null);
        }
        setCategoryId(
          product.categoryId?.toString() ||
            product.category_id?.toString() ||
            ""
        );

        // Populate images (convert from API format)
        if (data.images && data.images.length > 0) {
          setImages(
            data.images.map((img: any) => ({
              url: img.url,
              publicId: img.publicId,
              displayOrder: img.displayOrder,
              isPrimary: img.isPrimary,
              isNew: false,
            }))
          );
        }
      } catch (e) {
        console.error(e);
        setError("Failed to load product");
      } finally {
        setLoading(false);
      }
    }

    fetchProduct();
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      if (!mainImage) {
        setError("Main image is required");
        setSaving(false);
        return;
      }

      // Step 1: Update product basic info
      const res = await fetch(`/api/admin/products/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          price: parseFloat(price),
          description,
          detailedDescription: detailedDescription || description,
          imageUrl: mainImage.url,
          imagePublicId: mainImage.publicId,
          imageUrlHover: hoverImage?.url || null,
          imageHoverPublicId: hoverImage?.publicId || null,
          categoryId: categoryId ? parseInt(categoryId, 10) : null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to update product");
        return;
      }

      // Step 2: Update images (overwrite)
      if (images.length > 0) {
        const imagesRes = await fetch(`/api/admin/products/${id}/images`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ images }),
        });

        if (!imagesRes.ok) {
          console.error("Failed to save images");
        }
      }

      // Success - redirect to products list
      router.push("/admin/products");
    } catch (e) {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  // Loading state
  if (loading) {
    return (
      <main className="bg-gradient-to-b from-[#f5f5f7] to-white min-h-[calc(100vh-64px)]">
        <div className="container-custom py-10 md:py-14 max-w-3xl">
          <div className="h-4 w-32 rounded bg-gray-200 animate-pulse mb-6" />
          <div className="h-8 w-48 rounded bg-gray-200 animate-pulse mb-8" />
          <div className="rounded-2xl bg-white shadow-sm border border-[var(--color-border)] p-6">
            <div className="space-y-6">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-12 rounded-lg bg-gray-200 animate-pulse"
                />
              ))}
            </div>
          </div>
        </div>
      </main>
    );
  }

  async function handleCancel() {
    //temporary solution for dealing with orphan image
    // delete all the unsaved photo
    const newImages = images.filter((img) => img.isNew);
    const cleanupRequests: Promise<unknown>[] = [];

    if (newImages.length > 0) {
      cleanupRequests.push(
        ...newImages.map((img) =>
          fetch("/api/admin/delete-image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ publicId: img.publicId }),
          })
        )
      );
    }

    if (mainImage?.isNew) {
      cleanupRequests.push(
        fetch("/api/admin/delete-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ publicId: mainImage.publicId }),
        })
      );
    }

    if (hoverImage?.isNew) {
      cleanupRequests.push(
        fetch("/api/admin/delete-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ publicId: hoverImage.publicId }),
        })
      );
    }

    if (cleanupRequests.length > 0) {
      await Promise.allSettled(cleanupRequests);
    }

    router.push("/admin/products");
  }

  return (
    <div>
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
            Edit Product
          </h1>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            Update product details below
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

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                Category
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:outline-none transition-colors bg-white"
              >
                <option value="">No category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
                Assign product to a category for filtering
              </p>
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
                placeholder="Full product details"
              />
              <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
                Shown on product detail page
              </p>
            </div>

            <SingleImageUploader
              label="Main Image *"
              required
              value={mainImage}
              onChange={setMainImage}
              hint="Primary product image"
            />

            <SingleImageUploader
              label="Hover Image"
              value={hoverImage}
              onChange={setHoverImage}
              hint="Optional hover image"
            />

            {/* Gallery Images */}
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
                onClick={handleCancel}
                disabled={saving}
                className="flex-1 px-6 py-3 rounded-lg border border-[var(--color-border)] bg-white text-sm font-medium text-[var(--color-text-secondary)] hover:border-gray-400 hover:text-[var(--color-text-primary)] transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 px-6 py-3 rounded-lg bg-black text-white text-sm font-medium hover:bg-gray-900 transition-colors disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
