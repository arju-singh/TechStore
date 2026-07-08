import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { CartProvider } from "@/lib/cart";
import { AuthProvider } from "@/lib/authClient";
import { WishlistProvider } from "@/lib/wishlist";

export const metadata: Metadata = {
  title: {
    default: "TechStore — Phones, Laptops, Audio & More",
    template: "%s · TechStore",
  },
  description:
    "Shop the latest smartphones, laptops, audio gear and accessories with fast delivery across India.",
};

// Render on demand rather than at build time. The catalog is backed by a live,
// admin-editable database (and the Navbar reads categories on every page), so
// pages must reflect current data — and prerendering would open DB connections
// at build time that keep the build process from exiting.
export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">
        <AuthProvider>
          <WishlistProvider>
            <CartProvider>
              <Navbar />
              <main className="flex-1">{children}</main>
              <Footer />
            </CartProvider>
          </WishlistProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
