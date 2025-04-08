// packages/tailwind-config/tailwind.config.mjs
import { heroui } from "@heroui/theme";

/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    // packages/ui 内のコンポーネント自体をスキャン
    "../../packages/ui/src/**/*.{ts,tsx}",
    // apps/web など、ui コンポーネントを使用する可能性のある場所も追加
    "../../apps/web/src/**/*.{ts,tsx}",
    // HeroUI のコンポーネントパスを追加
    "../../node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}",
    // 必要に応じて他のパッケージも追加
  ],
  theme: {
    extend: {
      // ここでテーマの拡張が可能
    },
  },
  plugins: [
    // HeroUI プラグインを追加
    heroui(),
    // 必要に応じて他のプラグイン追加
  ],
};

export default config;
