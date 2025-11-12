"use client";

import { useCart } from "@/app/context/CartContext";

export default function CartPage() {
  const { cart, removeFromCart, clearCart } = useCart();

  if (cart.length === 0) {
    return <p>Your cart is empty.</p>;
  }

  return (
    <main style={{ padding: "20px" }}>
      <h1>Shopping Cart</h1>

      <ul>
        {cart.map((item) => (
          <li key={item.id}>
            <b>{item.name}</b> — {item.quantity} × ${item.priceCad} CAD
            <button onClick={() => removeFromCart(item.id)}>Remove</button>
          </li>
        ))}
      </ul>

      <hr />
      <p>
        Total: $
        {cart
          .reduce((sum, item) => sum + item.priceCad * item.quantity, 0)
          .toFixed(2)}{" "}
        CAD
      </p>

      <button onClick={clearCart}>Clear Cart</button>
    </main>
  );
}
