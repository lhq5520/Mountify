"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { User, Lock, Calendar, Shield, Eye, EyeOff, Info } from "lucide-react";
import { useToast } from "@/app/context/ToastContext";

interface UserProfile {
  id: number;
  email: string;
  role: string;
  createdAt: string;
  hasPassword: boolean; // newly update for divide credential user and google user
}

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { showToast } = useToast();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Password change form
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // Redirect if not logged in
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  // Fetch profile
  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch("/api/user/profile");
        if (res.ok) {
          const data = await res.json();
          setProfile(data);
        }
      } catch (e) {
        console.error("Failed to fetch profile:", e);
      } finally {
        setLoading(false);
      }
    }

    if (status === "authenticated") {
      fetchProfile();
    }
  }, [status]);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      showToast("New passwords do not match", "error");
      return;
    }

    if (newPassword.length < 6) {
      showToast("Password must be at least 6 characters", "error");
      return;
    }

    setChangingPassword(true);

    try {
      const res = await fetch("/api/user/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        showToast(data.error || "Failed to change password", "error");
        return;
      }

      showToast("Password changed successfully", "success");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (e) {
      showToast("Network error. Please try again.", "error");
    } finally {
      setChangingPassword(false);
    }
  }

  if (status === "loading" || loading) {
    return (
      <main className="bg-gradient-to-b from-[#f5f5f7] to-white min-h-[calc(100vh-64px)]">
        <div className="container-custom py-10 md:py-14 max-w-2xl">
          <div className="h-8 w-32 bg-gray-200 animate-pulse rounded mb-8" />
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-[var(--color-border)]">
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-12 bg-gray-200 animate-pulse rounded-lg"
                />
              ))}
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="bg-gradient-to-b from-[#f5f5f7] to-white min-h-[calc(100vh-64px)]">
      <div className="container-custom py-10 md:py-14 max-w-2xl">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-[var(--color-text-primary)]">
            Settings
          </h1>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
            Manage your account settings
          </p>
        </header>

        {/* Account Information */}
        <section className="rounded-2xl bg-white p-6 shadow-sm border border-[var(--color-border)] mb-6">
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
            Account Information
          </h2>

          <div className="space-y-4">
            {/* Email */}
            <div className="flex items-center gap-4 p-4 rounded-xl bg-[var(--color-background)]">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <User size={20} className="text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-[var(--color-text-tertiary)] uppercase tracking-wider">
                  Email
                </p>
                <p className="text-sm font-medium text-[var(--color-text-primary)]">
                  {profile?.email || "—"}
                </p>
              </div>
            </div>

            {/* Login Method - new */}
            <div className="flex items-center gap-4 p-4 rounded-xl bg-[var(--color-background)]">
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                {profile?.hasPassword ? (
                  <Lock size={20} className="text-gray-600" />
                ) : (
                  <svg width="20" height="20" viewBox="0 0 18 18" fill="none">
                    <path
                      d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"
                      fill="#4285F4"
                    />
                    <path
                      d="M9.003 18c2.43 0 4.467-.806 5.956-2.18l-2.909-2.26c-.806.54-1.836.86-3.047.86-2.344 0-4.328-1.584-5.036-3.711H.958v2.332C2.44 15.983 5.485 18 9.003 18z"
                      fill="#34A853"
                    />
                    <path
                      d="M3.964 10.712c-.18-.54-.282-1.117-.282-1.71 0-.593.102-1.17.282-1.71V4.96H.957C.347 6.175 0 7.55 0 9.002c0 1.452.348 2.827.957 4.042l3.007-2.332z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M9.003 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.464.891 11.428 0 9.002 0 5.485 0 2.44 2.017.958 4.96L3.964 7.29c.708-2.127 2.692-3.71 5.036-3.71z"
                      fill="#EA4335"
                    />
                  </svg>
                )}
              </div>
              <div className="flex-1">
                <p className="text-xs text-[var(--color-text-tertiary)] uppercase tracking-wider">
                  Login Method
                </p>
                <p className="text-sm font-medium text-[var(--color-text-primary)]">
                  {profile?.hasPassword ? "Email & Password" : "Google Account"}
                </p>
              </div>
            </div>

            {/* Role */}
            <div className="flex items-center gap-4 p-4 rounded-xl bg-[var(--color-background)]">
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                <Shield size={20} className="text-purple-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-[var(--color-text-tertiary)] uppercase tracking-wider">
                  Role
                </p>
                <p className="text-sm font-medium text-[var(--color-text-primary)] capitalize">
                  {profile?.role || "—"}
                </p>
              </div>
            </div>

            {/* Member Since */}
            <div className="flex items-center gap-4 p-4 rounded-xl bg-[var(--color-background)]">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <Calendar size={20} className="text-green-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-[var(--color-text-tertiary)] uppercase tracking-wider">
                  Member Since
                </p>
                <p className="text-sm font-medium text-[var(--color-text-primary)]">
                  {profile?.createdAt
                    ? new Date(profile.createdAt).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "—"}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Change Password - only for credential user */}
        {profile?.hasPassword ? (
          <section className="rounded-2xl bg-white p-6 shadow-sm border border-[var(--color-border)]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
                <Lock size={20} className="text-orange-600" />
              </div>
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                Change Password
              </h2>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
              {/* Current Password */}
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    className="w-full px-4 py-3 pr-12 rounded-lg border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:outline-none transition-colors"
                    placeholder="Enter current password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]"
                  >
                    {showCurrentPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className="w-full px-4 py-3 pr-12 rounded-lg border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:outline-none transition-colors"
                    placeholder="Enter new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]"
                  >
                    {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <p className="text-xs text-[var(--color-text-tertiary)] mt-1">
                  At least 6 characters
                </p>
              </div>

              {/* Confirm New Password */}
              <div>
                <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-lg border border-[var(--color-border)] focus:border-[var(--color-primary)] focus:outline-none transition-colors"
                  placeholder="Confirm new password"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={changingPassword}
                className="w-full px-6 py-3 rounded-lg bg-black text-white text-sm font-medium hover:bg-gray-900 transition-colors disabled:opacity-50"
              >
                {changingPassword ? "Updating..." : "Update Password"}
              </button>
            </form>
          </section>
        ) : (
          // OAuth user specific info
          <section className="rounded-2xl bg-white p-6 shadow-sm border border-[var(--color-border)]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Info size={20} className="text-blue-600" />
              </div>
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
                Password
              </h2>
            </div>
            <p className="text-sm text-[var(--color-text-secondary)]">
              You signed up with Google, so you don't have a password. Your
              account security is managed by Google.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
