"use client";

import { useState } from "react";
import { Upload, X, Loader2 } from "lucide-react";

interface ProductImage {
  url: string;
  publicId: string;
  displayOrder: number;
  isPrimary: boolean;
}

interface ImageUploaderProps {
  images: ProductImage[];
  setImages: React.Dispatch<React.SetStateAction<ProductImage[]>>;
}

export default function ImageUploader({
  images,
  setImages,
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle file selection
  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      // 1. Create FormData
      const formData = new FormData();
      formData.append("file", file);

      // 2. Upload to Cloudinary
      const res = await fetch("/api/admin/upload-image", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Upload failed");
        return;
      }

      // 3. Add to images array
      setImages((prev) => [
        ...prev,
        {
          url: data.url,
          publicId: data.publicId,
          displayOrder: prev.length,
          isPrimary: prev.length === 0, // First image is primary
        },
      ]);
    } catch (e) {
      setError("Network error. Please try again.");
    } finally {
      setUploading(false);
      // Clear input to allow re-uploading the same file
      e.target.value = "";
    }
  }

  // Remove image
  function handleRemove(indexToRemove: number) {
    setImages((prev) => {
      const newImages = prev.filter((_, index) => index !== indexToRemove);

      // Recalculate displayOrder and isPrimary
      return newImages.map((img, index) => ({
        ...img,
        displayOrder: index,
        isPrimary: index === 0,
      }));
    });
  }

  return (
    <div className="space-y-4">
      {/* Upload button */}
      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-[var(--color-border)] rounded-xl cursor-pointer hover:border-gray-400 hover:bg-gray-50 transition-colors">
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          {uploading ? (
            <>
              <Loader2 size={24} className="text-gray-400 animate-spin mb-2" />
              <p className="text-sm text-[var(--color-text-secondary)]">
                Uploading...
              </p>
            </>
          ) : (
            <>
              <Upload size={24} className="text-gray-400 mb-2" />
              <p className="text-sm text-[var(--color-text-secondary)]">
                Click to upload product images
              </p>
              <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
                PNG, JPG up to 5MB
              </p>
            </>
          )}
        </div>
        <input
          type="file"
          className="hidden"
          accept="image/*"
          onChange={handleFileSelect}
          disabled={uploading}
        />
      </label>

      {/* Error message */}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Image preview list */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {images.map((image, index) => (
            <div key={image.publicId} className="relative group">
              <img
                src={image.url}
                alt={`Product image ${index + 1}`}
                className="w-full h-24 object-cover rounded-lg border border-[var(--color-border)]"
              />

              {/* Primary image badge */}
              {image.isPrimary && (
                <span className="absolute top-1 left-1 bg-black text-white text-xs px-2 py-0.5 rounded">
                  Primary
                </span>
              )}

              {/* Delete button */}
              <button
                type="button"
                onClick={() => handleRemove(index)}
                className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Helper text */}
      {images.length > 0 && (
        <p className="text-xs text-[var(--color-text-tertiary)]">
          First image will be the primary image. Drag to reorder (coming soon).
        </p>
      )}
    </div>
  );
}
