import { heroui } from "@heroui/react";

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
    "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#1B2A4A",
        secondary: "#4B5C7A",
        accent: "#6366F1",
      },
    },
  },
  darkMode: "class",
  plugins: [heroui()],
};
