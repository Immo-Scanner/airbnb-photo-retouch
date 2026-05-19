import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: "#112527", soft: "#1c3c3f", muted: "#5d6c7b" },
        brand: { DEFAULT: "#2d62ff", dark: "#2d40ea", soft: "#eef2ff" },
        gold: { DEFAULT: "#f2b40c", soft: "#fcf8d8" },
        surface: { DEFAULT: "#ffffff", alt: "#fafafa" },
      },
      fontFamily: {
        sans: [
          "Inter",
          "Helvetica Neue",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      maxWidth: {
        prose: "640px",
      },
    },
  },
  plugins: [],
} satisfies Config;
