// Page for successful checkout
"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function CheckoutSuccessPage() {
  const params = useSearchParams();
  const sessionId = params.get("session_id");

  // State management
  const [status, setStatus] = useState<string>("pending");
  const [attemptCount, setAttemptCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<number | null>(null);

  // New state to record user's order total and email
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setError("No session ID found");
      return;
    }

    let isMounted = true;
    let timerId: NodeJS.Timeout;

    const checkOrderStatus = async () => {
      // If component unmounted, stop
      if (!isMounted) return;

      try {
        setAttemptCount((prev) => {
          const newCount = prev + 1;

          // If exceeded 15 attempts, stop
          if (newCount >= 15) {
            clearInterval(timerId);
          }

          return newCount;
        });

        const res = await fetch(`/api/orders/session/${sessionId}`);
        const data = await res.json();

        if (!isMounted) return;

        if (!res.ok) {
          setError(data.error || "Failed to fetch order");
          return;
        }

        // Clear previous error
        setError(null);

        setStatus(data.status);
        setOrderId(data.orderId);

        // Record user email and order total from session
        setEmail(data.email ?? null);

        // If paid, stop polling
        if (data.status === "paid") {
          clearInterval(timerId);
        }
      } catch (e) {
        if (isMounted) {
          setError("Network error");
        }
      }
    };

    // Execute immediately once
    checkOrderStatus();

    // Start timer
    timerId = setInterval(checkOrderStatus, 2000);

    // Cleanup function
    return () => {
      isMounted = false;
      clearInterval(timerId);
    };
  }, [sessionId]); // Only depend on sessionId

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
                  Thank you for your purchase
                </h1>
                <p className="mt-2 text-sm md:text-base text-gray-600">
                  Your order will ship as soon as possible!
                  <br />
                  {orderId && (
                    <>
                      Your order number is{" "}
                      <span className="font-medium">#{orderId}</span>.
                    </>
                  )}
                </p>
              </>
            )}

            {status === "pending" && attemptCount < 15 && (
              <>
                <h1 className="text-2xl md:text-3xl font-semibold text-gray-900">
                  Confirming your payment...
                </h1>
                <p className="mt-2 text-sm text-gray-600">
                  Attempt {attemptCount} of 15
                </p>
              </>
            )}

            {status === "pending" && attemptCount >= 15 && (
              <>
                <h1 className="text-2xl md:text-3xl font-semibold text-gray-900">
                  Still checking your payment
                </h1>
                <p className="mt-2 text-sm text-gray-600">
                  We couldn't confirm your payment right now.
                  <br />
                  Please check your email or contact support.
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
          <div className="bg-gray-50 rounded-2xl shadow-sm border border-gray-200 p-6 mb-10">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              Order Summary
            </h2>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Payment Status</span>
                <span className="font-medium text-gray-900">
                  {status === "paid"
                    ? "Payment Received"
                    : status === "pending"
                    ? "Waiting For Payment Confirmation"
                    : "Unknown"}
                </span>
              </div>

              {orderId && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Customer Email</span>
                  <span className="font-medium text-gray-900">{email}</span>
                </div>
              )}

              <div className="flex justify-between border-t pt-3">
                <span className="text-gray-600">Session ID </span>
                <span className="font-medium text-gray-900">{sessionId}</span>
              </div>
            </div>
          </div>

          {/* Footer button */}
          <div className="flex justify-center">
            <a
              href="/"
              className="px-6 py-2.5 rounded-full border border-gray-300 bg-white hover:bg-gray-100 transition text-sm font-medium text-gray-800"
            >
              Back to Home
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
