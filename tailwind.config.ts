import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        radar: {
          dark: "#0f172a",
          accent: "#3b82f6",
          warn: "#f59e0b",
          danger: "#ef4444",
          success: "#22c55e",
        },
      },
    },
  },
  plugins: [],
};
export default config;
