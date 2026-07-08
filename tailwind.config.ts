import type { Config } from "tailwindcss";

/**
 * Minimal dark theme (reference: motionsites.ai). The custom token NAMES are
 * kept so existing markup doesn't break, but their VALUES are remapped to a
 * near-black, high-contrast palette — so `text-ink`, `bg-amz-bg`, borders, nav
 * and links all flip to dark-minimal at once.
 */
export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Accent — a single vivid lime used sparingly (CTAs, active states).
        brand: {
          50: "#f2fbe7",
          100: "#e4f7cf",
          200: "#c9ef9f",
          300: "#ade66f",
          400: "#9ee65a",
          500: "#84cc16",
          600: "#a3e635",
          700: "#65a30d",
          800: "#4d7c0f",
          900: "#365314",
        },
        // Structural tokens remapped to a dark surface system.
        amz: {
          navy: "#0b0b0d", // top nav
          navy2: "#141416", // panels / sub-surfaces
          navy3: "#1f1f23", // hover
          footer: "#0d0d0f",
          footerdark: "#08080a",
          yellow: "#d4f56a", // primary CTA (lime, pops on black)
          yellowH: "#c2ea4f",
          orange: "#d4f56a", // buy — same accent
          orangeH: "#c2ea4f",
          search: "#d4f56a",
          searchH: "#c2ea4f",
          star: "#facc15", // ratings stay gold
          link: "#a1a1aa", // muted link
          linkH: "#fafafa", // link hover → white
          price: "#f4f4f5",
          deal: "#f87171", // discount accent
          bg: "#0a0a0b", // app background
          border: "#262629", // hairline borders
          borderdark: "#71717a",
        },
        ink: {
          DEFAULT: "#f4f4f5", // primary text → near-white
          soft: "#a1a1aa", // secondary text
        },
        cream: "#0a0a0b",
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "'SF Pro Text'",
          "'Inter'",
          "'Segoe UI'",
          "Roboto",
          "'Helvetica Neue'",
          "Arial",
          "sans-serif",
        ],
        display: [
          "-apple-system",
          "BlinkMacSystemFont",
          "'SF Pro Display'",
          "'Inter'",
          "'Segoe UI'",
          "sans-serif",
        ],
      },
      borderRadius: {
        lg: "0.75rem",
        xl: "1rem",
        "2xl": "1.25rem",
        "3xl": "1.5rem",
        "4xl": "2rem",
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(255,255,255,0.04)",
        "glow-lg": "0 20px 60px -20px rgba(0,0,0,0.8)",
        pop: "0 8px 30px -12px rgba(0,0,0,0.7)",
        soft: "0 1px 0 rgba(255,255,255,0.03)",
        amz: "0 20px 50px -24px rgba(0,0,0,0.85)",
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(180deg,#141416 0%,#0a0a0b 100%)",
        "brand-gradient-soft": "linear-gradient(180deg,#1f1f23 0%,#141416 100%)",
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(18px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": { from: { opacity: "0" }, to: { opacity: "1" } },
      },
      animation: {
        "fade-up": "fade-up 0.5s cubic-bezier(0.22,1,0.36,1) both",
        "fade-in": "fade-in 0.6s ease both",
      },
    },
  },
  plugins: [],
} satisfies Config;
