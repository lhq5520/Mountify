"use client";

import { createContext, useContext, useState, ReactNode } from "react";

type ToastType = "success" | "error" | "warning";

interface Toast {
  message: string;
  type: ToastType;
}

interface ToastContextType {
  toast: Toast | null;
  showToast: (message: string, type?: ToastType) => void;
  hideToast: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);

  function showToast(message: string, type: ToastType = "success") {
    setToast({ message, type });

    // auto hide
    setTimeout(() => {
      setToast(null);
    }, 3000);
  }

  function hideToast() {
    setToast(null);
  }

  return (
    <ToastContext.Provider value={{ toast, showToast, hideToast }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
