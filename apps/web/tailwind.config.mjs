// apps/web/tailwind.config.mjs
import { heroui } from "@heroui/theme";

/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    // Moved UI components
    "./src/components/ui/**/*.{ts,tsx}",
    // App source files
    "./src/**/*.{ts,tsx}",
    // HeroUI theme components
    "../node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // Theme extensions can be added here
    },
  },
  plugins: [
    // Add HeroUI plugin
    heroui(),
    // Add other plugins if needed
  ],
};

export default config;
