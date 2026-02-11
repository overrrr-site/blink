/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./liff.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#FAFAF9",
        foreground: "#292524",
        primary: {
          DEFAULT: "#EA580C",
          foreground: "#FFFFFF",
        },
        secondary: {
          DEFAULT: "#E7E5E4",
          foreground: "#292524",
        },
        muted: {
          DEFAULT: "#F5F5F4",
          foreground: "#57534E",
        },
        accent: {
          DEFAULT: "#FEF3C7",
          foreground: "#451A03",
        },
        destructive: "#EF4444",
        card: "#FFFFFF",
        border: "#E7E5E4",
        input: "#FFFFFF",
        ring: "#EA580C",
        chart: {
          1: "#EA580C",
          2: "#84CC16",
          3: "#06B6D4",
          4: "#F59E0B",
          5: "#EC4899",
        },
      },
      fontFamily: {
        sans: ["Nunito Sans", "sans-serif"],
        heading: ["Nunito Sans", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "0.5rem",
        lg: "0.75rem",
        xl: "1rem",
        "2xl": "1.25rem",
      },
    },
  },
  plugins: [],
}
