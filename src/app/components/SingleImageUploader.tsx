//used for main page image
"use client";

import { useState } from "react";
import { Upload, X, Loader2 } from "lucide-react";
import { useToast } from "@/app/context/ToastContext";

interface SingleImageUploaderProps {
  label: string;
  required?: boolean;
  value: { url: string; publicId: string; isNew: boolean } | null;
  onChange: (
    value: { url: string; publicId: string; isNew: boolean } | null
  ) => void;
  hint?: string;
  uploadEndpoint?: string;
  allowClear?: boolean;
}

export default function SingleImageUploader({
  label,
  required = false,
  value,
  onChange,
  hint,
  uploadEndpoint = "/api/admin/upload-main-image",
  allowClear = true,
}: SingleImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState(16 / 9);
  const { showToast } = useToast();

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError("File must be 5MB or smaller");
      showToast("Image must be 5MB or smaller", "error");
      e.target.value = "";
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(uploadEndpoint, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Upload failed");
        return;
      }

      onChange({ url: data.url, publicId: data.publicId, isNew: true });
      if (data.width && data.height) {
        const ratio = data.width / data.height;
        // clamp to avoid extreme aspect ratios breaking layout
        setAspectRatio(Math.min(Math.max(ratio, 0.75), 2));
      } else {
        setAspectRatio(16 / 9);
      }
      showToast("Image uploaded", "success");
    } catch (uploadErr) {
      console.error("Upload error", uploadErr);
      setError("Network error. Please try again.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handleClear() {
    if (!value) return;

    // Only delete from Cloudinary if this upload is new and unsaved
    if (value.isNew) {
      try {
        await fetch("/api/admin/delete-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ publicId: value.publicId }),
        });
      } catch (delErr) {
        console.error("Failed to delete temp image", delErr);
      }
    }

    onChange(null);
    setAspectRatio(16 / 9);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-[var(--color-text-primary)]">
          {label}
          {required && <span className="text-red-500"> </span>}
        </label>
        {value && allowClear && (
          <button
            type="button"
            onClick={handleClear}
            className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            disabled={uploading}
          >
            Remove
          </button>
        )}
      </div>

      {!value && (
        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-[var(--color-border)] rounded-xl cursor-pointer hover:border-gray-400 hover:bg-gray-50 transition-colors">
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            {uploading ? (
              <>
                <Loader2
                  size={24}
                  className="text-gray-400 animate-spin mb-2"
                />
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Uploading...
                </p>
              </>
            ) : (
              <>
                <Upload size={24} className="text-gray-400 mb-2" />
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Click to upload image
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
      )}

      {value && (
        <div
          className="relative w-full overflow-hidden rounded-lg border border-[var(--color-border)]"
          style={{ aspectRatio }}
        >
          <img
            src={value.url}
            alt={`${label} preview`}
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
            {value.isNew ? "New" : "Saved"}
          </div>
          {allowClear && (
            <button
              type="button"
              onClick={handleClear}
              disabled={uploading}
              className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </div>
      )}

      {hint && (
        <p className="text-xs text-[var(--color-text-tertiary)]">{hint}</p>
      )}

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
