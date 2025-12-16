"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong");
        return;
      }

      setSubmitted(true);
    } catch (e) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // 提交成功后显示确认信息
  if (submitted) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-[var(--color-background)] px-4">
        <div className="w-full max-w-md">
          <div
            className="rounded-2xl p-8 shadow-lg text-center"
            style={{
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-border)",
            }}
          >
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
              <Mail size={32} className="text-green-600" />
            </div>

            <h1
              className="text-2xl font-semibold mb-3"
              style={{ color: "var(--color-text-primary)" }}
            >
              Check your email
            </h1>

            <p
              className="text-sm mb-6"
              style={{ color: "var(--color-text-secondary)" }}
            >
              If an account exists for <strong>{email}</strong>, you'll receive
              a password reset link shortly.
            </p>

            <Link
              href="/auth/signin"
              className="inline-flex items-center gap-2 text-sm font-medium hover:underline"
              style={{ color: "var(--color-primary)" }}
            >
              <ArrowLeft size={16} />
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-[var(--color-background)] px-4">
      <div className="w-full max-w-md">
        <div
          className="rounded-2xl p-8 shadow-lg"
          style={{
            backgroundColor: "var(--color-surface)",
            border: "1px solid var(--color-border)",
          }}
        >
          {/* Back Link */}
          <Link
            href="/auth/signin"
            className="inline-flex items-center gap-1 text-sm mb-6 hover:underline"
            style={{ color: "var(--color-text-secondary)" }}
          >
            <ArrowLeft size={16} />
            Back to sign in
          </Link>

          {/* Header */}
          <div className="mb-8">
            <h1
              className="text-2xl font-semibold mb-2"
              style={{ color: "var(--color-text-primary)" }}
            >
              Forgot password?
            </h1>
            <p style={{ color: "var(--color-text-secondary)" }}>
              Enter your email and we'll send you a reset link.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium mb-2"
                style={{ color: "var(--color-text-primary)" }}
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-lg transition-all duration-200"
                style={{
                  border: "1px solid var(--color-border)",
                  backgroundColor: "var(--color-surface)",
                  color: "var(--color-text-primary)",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "var(--color-primary)";
                  e.target.style.outline = "none";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "var(--color-border)";
                }}
                placeholder="you@example.com"
              />
            </div>

            {/* Error */}
            {error && (
              <div
                className="p-3 rounded-lg text-sm"
                style={{
                  backgroundColor: "#FEE2E2",
                  color: "var(--color-error)",
                  border: "1px solid var(--color-error)",
                }}
              >
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg font-medium transition-all duration-200 disabled:opacity-50"
              style={{
                backgroundColor: "var(--color-text-primary)",
                color: "var(--color-surface)",
              }}
            >
              {loading ? "Sending..." : "Send reset link"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
