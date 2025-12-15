import "./globals.css";
import { ToastProvider } from "@/app/context/ToastContext";
import { CartProvider } from "@/app/context/CartContext";
import { SessionProvider } from "next-auth/react";
import Navbar from "@/app/components/Navbar";
import Toast from "@/app/components/Toast";
import type { Metadata } from "next";
import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Mountify - Premium E-commerce",
  description: "Discover our curated collection of premium products",
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
      </head>
      <body className="antialiased">
        <ToastProvider>
          <SessionProvider>
            <CartProvider>
              <div className="flex min-h-screen flex-col">
                <Navbar />
                <main className="flex-1">{children}</main>
                <footer className="bg-white border-t border-[var(--color-border)]">
                  <div className="container-custom py-8">
                    <div className="text-center text-[var(--color-text-secondary)] text-sm">
                      <p>
                        &copy; {new Date().getFullYear()} Mountify. All rights
                        reserved.
                      </p>
                    </div>
                  </div>
                </footer>
              </div>
              <Toast />
            </CartProvider>
          </SessionProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
