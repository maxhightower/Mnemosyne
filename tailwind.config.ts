import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#0b0c10",
          900: "#121317",
          800: "#1a1c22",
          700: "#23262f",
          600: "#2e323d",
        },
        ember: {
          400: "#f0b35b",
          500: "#e09a3c",
          600: "#c47e22",
        },
        arcane: {
          400: "#7aa2f7",
          500: "#5b86e5",
        },
      },
    },
  },
  plugins: [],
};

export default config;
