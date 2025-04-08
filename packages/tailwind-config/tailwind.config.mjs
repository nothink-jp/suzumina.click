// packages/tailwind-config/tailwind.config.mjs
/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    // packages/ui 内のコンポーネント自体をスキャン
    "../../packages/ui/src/**/*.{ts,tsx}",
    // apps/web など、ui コンポーネントを使用する可能性のある場所も追加
    "../../apps/web/src/**/*.{ts,tsx}",
    // 必要に応じて他のパッケージも追加
  ],
  theme: {
    extend: {
      // ここでテーマの拡張が可能
    },
  },
  plugins: [
    // 必要に応じてプラグイン追加
  ],
};

export default config;
