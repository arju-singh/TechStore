/** @type {import('next').NextConfig} */
const nextConfig = {
  // Default build output dir (`.next`). Vercel's Next.js builder expects this;
  // a custom distDir can break its output detection. (The project is no longer
  // on iCloud, so the old `build.nosync/.next` workaround is unnecessary.)
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "picsum.photos" },
      // Real product photos for the catalog (swap for your own image host).
      { protocol: "https", hostname: "cdn.dummyjson.com" },
      // Cloudinary CDN — product images/banners/thumbnails (added for deploy).
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  },
  // Baseline security headers applied to every response.
  async headers() {
    const isProd = process.env.NODE_ENV === "production";
    // Conservative CSP: allow the app's own assets + the two remote image hosts.
    // 'unsafe-inline' is required for Next's inlined runtime/styles; scripts are
    // restricted to same-origin (plus Razorpay's hosted checkout when used).
    // Next.js dev (React Refresh) evaluates strings as JS, so 'unsafe-eval' is
    // required in development only. Production never gets it.
    const scriptSrc = isProd
      ? "script-src 'self' 'unsafe-inline' https://checkout.razorpay.com"
      : "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com";
    const csp = [
      "default-src 'self'",
      "img-src 'self' data: https://images.unsplash.com https://picsum.photos https://cdn.dummyjson.com https://res.cloudinary.com",
      scriptSrc,
      "style-src 'self' 'unsafe-inline'",
      "font-src 'self' data:",
      "connect-src 'self' https://api.razorpay.com https://lumberjack.razorpay.com https://api.cloudinary.com",
      "frame-src https://api.razorpay.com https://checkout.razorpay.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; ");

    const headers = [
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-DNS-Prefetch-Control", value: "off" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      { key: "Content-Security-Policy", value: csp },
    ];
    if (isProd) {
      headers.push({
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
      });
    }
    return [{ source: "/:path*", headers }];
  },
};

export default nextConfig;
