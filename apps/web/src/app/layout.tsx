import "./globals.css";
import type { Metadata } from "next";
// ClientProviders のインポートを削除
// import { ClientProviders } from "./client-providers";
import { Providers } from "./providers"; // Providers は引き続き必要

export const metadata: Metadata = {
  title: "すずみなふぁみりー",
  description: "すずみなふぁみりーのコミュニティサイト",
};

/**
 * アプリケーション全体のルートレイアウトコンポーネント。
 * HTML の基本構造、言語設定、およびグローバルなプロバイダーを設定します。
 * @param props - レイアウトコンポーネントのプロパティ。
 * @param props.children - レイアウト内にレンダリングされる子要素。
 * @returns ルートレイアウトの React 要素。
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>
        {/* ClientProviders ラッパーを削除し、Providers を直接使用 */}
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
