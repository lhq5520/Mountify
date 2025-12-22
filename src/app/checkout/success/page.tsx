// Page for successful checkout
"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useCart } from "@/app/context/CartContext";
import Link from "next/link";

export default function CheckoutSuccessPage() {
  const params = useSearchParams();
  const sessionId = params.get("session_id");
  const { clearCart } = useCart();

  // State management
  const [status, setStatus] = useState<string>("pending");
  const [attemptCount, setAttemptCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<number | null>(null);
  const [cartCleared, setCartCleared] = useState(false);

  // Order details
  const [email, setEmail] = useState<string | null>(null);
  const [total, setTotal] = useState<number | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setError("No session ID found");
      return;
    }

    let isMounted = true;
    let timerId: NodeJS.Timeout;

    // Progressive polling intervals
    // First 5 attempts: 1s each = 5s
    // Next 10 attempts: 3s each = 30s
    // Next 10 attempts: 5s each = 50s
    // Total: 25 attempts over 85 seconds
    const getPollingDelay = (attempt: number): number => {
      if (attempt <= 5) return 1000; // 1 second
      if (attempt <= 15) return 3000; // 3 seconds
      if (attempt <= 25) return 5000; // 5 seconds
      return 0; // Stop polling
    };

    const checkOrderStatus = async (currentAttempt: number = 0) => {
      // If component unmounted, stop
      if (!isMounted) return;

      const newAttempt = currentAttempt + 1;
      setAttemptCount(newAttempt);

      // If exceeded max attempts, stop
      if (newAttempt > 25) {
        return;
      }

      try {
        const res = await fetch(`/api/orders/session/${sessionId}`);
        const data = await res.json();

        if (!isMounted) return;

        if (!res.ok) {
          setError(data.error || "Failed to fetch order");
          // Schedule next attempt even on error
          const delay = getPollingDelay(newAttempt);
          if (delay > 0) {
            timerId = setTimeout(() => checkOrderStatus(newAttempt), delay);
          }
          return;
        }

        // Clear previous error
        setError(null);

        setStatus(data.status);
        setOrderId(data.orderId);
        setEmail(data.email ?? null);
        setTotal(data.total ?? null);

        // If paid, stop polling
        if (data.status === "paid") {
          return;
        }

        // Schedule next check with progressive delay
        const delay = getPollingDelay(newAttempt);
        if (delay > 0) {
          timerId = setTimeout(() => checkOrderStatus(newAttempt), delay);
        }
      } catch (e) {
        if (isMounted) {
          setError("Network error");
          // Schedule next attempt even on error
          const delay = getPollingDelay(newAttempt);
          if (delay > 0) {
            timerId = setTimeout(() => checkOrderStatus(newAttempt), delay);
          }
        }
      }
    };

    // Start polling immediately
    checkOrderStatus(0);

    // Cleanup function
    return () => {
      isMounted = false;
      if (timerId) {
        clearTimeout(timerId);
      }
    };
  }, [sessionId]); // Only depend on sessionId

  // Clear cart once payment is confirmed
  useEffect(() => {
    if (status === "paid" && !cartCleared) {
      clearCart();
      setCartCleared(true);
    }
  }, [status, cartCleared, clearCart]);

  // Format currency
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(price);
  };

  // Calculate estimated shipping date (3-5 business days)
  const getEstimatedShipping = () => {
    const today = new Date();
    const minDays = new Date(today);
    const maxDays = new Date(today);

    minDays.setDate(today.getDate() + 3);
    maxDays.setDate(today.getDate() + 5);

    const options: Intl.DateTimeFormatOptions = {
      month: "short",
      day: "numeric",
    };
    return `${minDays.toLocaleDateString(
      "en-US",
      options
    )} - ${maxDays.toLocaleDateString("en-US", options)}`;
  };

  return (
    <main className="bg-gradient-to-b from-[#f0f4ff] to-white min-h-[calc(100vh-64px)] flex justify-center px-4 py-10">
      <div className="w-full max-w-3xl">
        {/* Card */}
        <div className="rounded-3xl bg-white shadow-[0_6px_25px_rgba(0,0,0,0.07)] border border-gray-200 px-6 py-10 md:px-12 md:py-12">
          {/* Top icon */}
          <div className="flex justify-center mb-6">
            {status === "paid" && (
              <div className="h-16 w-16 flex items-center justify-center rounded-full bg-green-100">
                <span className="text-3xl text-green-600">✓</span>
              </div>
            )}

            {status === "pending" && attemptCount < 15 && (
              <div className="h-16 w-16 flex items-center justify-center rounded-full bg-gray-100">
                <div className="h-7 w-7 animate-spin rounded-full border-2 border-gray-400 border-t-transparent" />
              </div>
            )}

            {status === "pending" && attemptCount >= 15 && (
              <div className="h-16 w-16 flex items-center justify-center rounded-full bg-yellow-100">
                <span className="text-2xl text-yellow-600">!</span>
              </div>
            )}

            {(error || !sessionId) && status !== "paid" && (
              <div className="h-16 w-16 flex items-center justify-center rounded-full bg-red-100">
                <span className="text-2xl text-red-600">✕</span>
              </div>
            )}
          </div>

          {/* Header text */}
          <div className="text-center mb-10">
            {status === "paid" && (
              <>
                <h1 className="text-2xl md:text-3xl font-semibold text-gray-900">
                  Thank you for your purchase!
                </h1>
                <p className="mt-2 text-sm md:text-base text-gray-600">
                  Your order has been confirmed and will be processed shortly.
                  {orderId && (
                    <>
                      <br />
                      Order number:{" "}
                      <span className="font-medium">#{orderId}</span>
                    </>
                  )}
                </p>
              </>
            )}

            {status === "pending" && attemptCount < 25 && (
              <>
                <h1 className="text-2xl md:text-3xl font-semibold text-gray-900">
                  Confirming your payment...
                </h1>
                <p className="mt-2 text-sm text-gray-600">
                  Please wait while we verify your payment
                </p>
              </>
            )}

            {status === "pending" && attemptCount >= 25 && (
              <>
                <h1 className="text-2xl md:text-3xl font-semibold text-gray-900">
                  Payment verification in progress
                </h1>
                <p className="mt-2 text-sm text-gray-600">
                  We're still confirming your payment.
                  <br />A confirmation email will be sent to you shortly.
                </p>
              </>
            )}

            {(error || !sessionId) && status !== "paid" && (
              <>
                <h1 className="text-2xl md:text-3xl font-semibold text-gray-900">
                  Something went wrong
                </h1>
                <p className="mt-2 text-sm text-gray-600">
                  {error || "Invalid checkout session."}
                </p>
              </>
            )}
          </div>

          {/* Order Summary card */}
          <div className="bg-gray-50 rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Order Summary
            </h2>

            <div className="space-y-3 text-sm">
              {/* Order Total */}
              {total !== null && (
                <div className="flex justify-between items-center py-2 border-b border-gray-200">
                  <span className="text-gray-600">Order Total</span>
                  <span className="text-xl font-bold text-gray-900">
                    {formatPrice(total)}
                  </span>
                </div>
              )}

              {/* Payment Status */}
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Payment Status</span>
                <span className="font-medium text-gray-900">
                  {status === "paid" ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-600" />
                      Paid
                    </span>
                  ) : status === "pending" ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-700">
                      <span className="h-1.5 w-1.5 rounded-full bg-yellow-600" />
                      Pending
                    </span>
                  ) : (
                    "Unknown"
                  )}
                </span>
              </div>

              {/* Email Confirmation */}
              {email && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Confirmation Email</span>
                  <span className="font-medium text-gray-900 truncate max-w-[200px]">
                    {email}
                  </span>
                </div>
              )}

              {/* Estimated Shipping */}
              {status === "paid" && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Estimated Shipping</span>
                  <span className="font-medium text-gray-900">
                    {getEstimatedShipping()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* What's Next section */}
          {status === "paid" && (
            <div className="bg-blue-50 rounded-2xl border border-blue-200 p-5 mb-6">
              <h3 className="text-sm font-semibold text-blue-900 mb-2">
                What happens next?
              </h3>
              <ul className="text-sm text-blue-800 space-y-1.5">
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>You'll receive a confirmation email shortly</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>
                    We'll send you tracking info once your order ships
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Track your order anytime from your orders page</span>
                </li>
              </ul>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {status === "paid" && orderId && (
              <Link
                href="/orders"
                className="px-6 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 transition text-sm font-medium text-white text-center"
              >
                View Order Details
              </Link>
            )}
            <Link
              href="/"
              className="px-6 py-2.5 rounded-full border border-gray-300 bg-white hover:bg-gray-100 transition text-sm font-medium text-gray-800 text-center"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
