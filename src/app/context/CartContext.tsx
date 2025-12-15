"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

import type { Product } from "../types";
import { useSession } from "next-auth/react";
import { useToast } from "@/app/context/ToastContext";

interface CartItem extends Product {
  quantity: number;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (p: Product) => void;
  removeFromCart: (id: number) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const { showToast } = useToast();

  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "authenticated" && session?.user?.id) {
      fetchCartFromDatabase();
    } else if (status === "unauthenticated") {
      setCart([]);
    }
  }, [session?.user?.id, status]);

  async function fetchCartFromDatabase() {
    try {
      const res = await fetch("/api/cart");
      if (!res.ok) {
        throw new Error("Failed to fetch cart");
      }
      const data = await res.json();
      setCart(data.cart || []);
    } catch (e) {
      console.error("Error loading cart:", e);
    }
  }

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((p) => p.id === product.id);
      if (existing) {
        return prev.map((p) =>
          p.id === product.id ? { ...p, quantity: p.quantity + 1 } : p
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });

    if (session?.user?.id) {
      fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id,
          quantity: 1,
        }),
      }).catch((e) => {
        console.error("Failed to sync cart to database:", e);
      });
    }

    // update - Version 5C new toast system
    showToast(`${product.name} added to cart`, "success");
  };

  const removeFromCart = (id: number) => {
    setCart((prev) => prev.filter((p) => p.id !== id));

    if (session?.user?.id) {
      fetch(`/api/cart/${id}`, {
        method: "DELETE",
      }).catch((e) => {
        console.error("Failed to remove from cart:", e);
      });
    }
  };

  const clearCart = () => {
    setCart([]);

    if (session?.user?.id) {
      fetch("/api/cart", {
        method: "DELETE",
      }).catch((e) => {
        console.error("Failed to clear cart:", e);
      });
    }
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
