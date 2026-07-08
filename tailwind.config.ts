import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // brand = Amazon link teal-blue (links, focus, secondary accents)
        brand: {
          50: "#e6f2f4",
          100: "#cce6e9",
          200: "#99cdd3",
          300: "#66b3bd",
          400: "#339aa7",
          500: "#008296",
          600: "#007185",
          700: "#005f6b",
          800: "#004a54",
          900: "#00363d",
        },
        // Amazon system colors
        amz: {
          navy: "#131921", // top header
          navy2: "#232f3e", // sub header / footer top
          navy3: "#37475a", // hover
          footer: "#232f3e",
          footerdark: "#131a22", // footer bottom bar
          yellow: "#ffd814", // Add to Cart
          yellowH: "#f7ca00",
          orange: "#ffa41c", // Buy Now
          orangeH: "#fa8900",
          search: "#febd69", // search button
          searchH: "#f3a847",
          star: "#ffa41c",
          link: "#007185",
          linkH: "#c7511f", // link hover (orange)
          price: "#0f1111",
          deal: "#cc0c39",
          bg: "#eaeded", // app background
          border: "#d5d9d9",
          borderdark: "#888c8c",
        },
        ink: {
          DEFAULT: "#0f1111",
          soft: "#232f3e",
        },
        cream: "#eaeded",
      },
      fontFamily: {
        sans: ["'Amazon Ember'", "Arial", "Helvetica", "sans-serif"],
        display: ["'Amazon Ember'", "Arial", "Helvetica", "sans-serif"],
      },
      borderRadius: {
        lg: "0.5rem",
        xl: "0.5rem",
        "2xl": "0.5rem",
        "3xl": "0.625rem",
        "4xl": "0.75rem",
      },
      boxShadow: {
        glow: "0 2px 5px rgba(15,17,17,0.15)",
        "glow-lg": "0 4px 11px rgba(15,17,17,0.2)",
        pop: "0 2px 5px rgba(15,17,17,0.15)",
        soft: "0 1px 2px rgba(15,17,17,0.1)",
        amz: "0 2px 8px rgba(15,17,17,0.15)",
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(180deg,#232f3e 0%,#131921 100%)",
        "brand-gradient-soft": "linear-gradient(180deg,#37475a 0%,#232f3e 100%)",
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.4s ease both",
      },
    },
  },
  plugins: [],
} satisfies Config;
