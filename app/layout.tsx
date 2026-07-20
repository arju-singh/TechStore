import type { Metadata, Viewport } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { CartProvider } from "@/lib/cart";
import { AuthProvider } from "@/lib/authClient";
import { WishlistProvider } from "@/lib/wishlist";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import { OrganizationJsonLd } from "@/components/JsonLd";
import {
  siteUrl,
  SITE_NAME,
  SITE_TAGLINE,
  SITE_DESCRIPTION,
  THEME_COLOR,
} from "@/lib/site";

const TITLE_DEFAULT = `${SITE_NAME} — ${SITE_TAGLINE}`;

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: {
    default: TITLE_DEFAULT,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: [
    "online shopping India",
    "buy smartphones",
    "laptops",
    "headphones",
    "wearables",
    "electronics",
    "wholesale",
    "bulk pricing",
    "B2B",
  ],
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: "shopping",
  alternates: { canonical: "/" },
  formatDetection: { telephone: false, email: false, address: false },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: SITE_NAME,
  },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: TITLE_DEFAULT,
    description: SITE_DESCRIPTION,
    url: "/",
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE_DEFAULT,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export const viewport: Viewport = {
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: THEME_COLOR },
    { color: THEME_COLOR },
  ],
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
        {/* Keyboard/screen-reader users can jump past the nav straight to content. */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-brand-400 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-black focus:shadow-pop focus:outline-none focus:ring-2 focus:ring-brand-400/50"
        >
          Skip to content
        </a>
        <OrganizationJsonLd />
        <AuthProvider>
          <WishlistProvider>
            <CartProvider>
              <Navbar />
              <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
                {children}
              </main>
              <Footer />
            </CartProvider>
          </WishlistProvider>
        </AuthProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
