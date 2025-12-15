"use client";

import { useEffect } from "react";
import { CheckCircle, XCircle, AlertTriangle, X } from "lucide-react";
import { useToast } from "@/app/context/ToastContext";

const icons = {
  success: <CheckCircle size={20} className="text-green-600" />,
  error: <XCircle size={20} className="text-red-600" />,
  warning: <AlertTriangle size={20} className="text-yellow-600" />,
};

const bgColors = {
  success: "bg-green-100",
  error: "bg-red-100",
  warning: "bg-yellow-100",
};

const titles = {
  success: "Success",
  error: "Error",
  warning: "Warning",
};

export default function Toast() {
  const { toast, hideToast } = useToast();

  // Auto-hide on ESC key
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape" && toast) {
        hideToast();
      }
    }

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [toast, hideToast]);

  if (!toast) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 pointer-events-none"
        style={{ backgroundColor: "rgba(0, 0, 0, 0.02)" }}
      />

      {/* Toast Card */}
      <div className="fixed top-20 right-6 z-50 animate-slideInRight">
        <div
          className="flex items-center gap-3 rounded-2xl px-5 py-4 shadow-xl min-w-[320px]"
          style={{
            backgroundColor: "var(--color-surface)",
            border: "1px solid var(--color-border)",
          }}
        >
          {/* Icon */}
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-full ${
              bgColors[toast.type]
            } flex-shrink-0`}
          >
            {icons[toast.type]}
          </div>

          {/* Message */}
          <div className="flex-1">
            <p className="text-sm font-medium text-[var(--color-text-primary)]">
              {titles[toast.type]}
            </p>
            <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
              {toast.message}
            </p>
          </div>

          {/* Close Button */}
          <button
            onClick={hideToast}
            className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0"
            aria-label="Close notification"
          >
            <X size={16} className="text-[var(--color-text-secondary)]" />
          </button>
        </div>
      </div>
    </>
  );
}
