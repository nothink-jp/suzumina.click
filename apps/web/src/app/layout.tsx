import "./globals.css";
import { auth } from "@/auth";
import { UIProvider } from "@/components/ui"; // Updated import path
import type { Metadata } from "next";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "すずみなふぁみりー",
  description: "すずみなふぁみりーのコミュニティサイト",
};

/**
 * アプリケーション全体のルートレイアウトコンポーネント。
 * HTML の基本構造、言語設定、およびグローバルなプロバイダー (UIProvider, Providers) を設定します。
 * @param props - レイアウトコンポーネントのプロパティ。
 * @param props.children - レイアウト内にレンダリングされる子要素。
 * @returns ルートレイアウトの React 要素。
 */
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth(); // サーバーサイドでセッション情報を取得

  return (
    <html lang="ja">
      <body>
        {/* UIProvider と Providers でアプリケーション全体をラップ */}
        <UIProvider>
          <Providers session={session}>{children}</Providers>
        </UIProvider>
      </body>
    </html>
  );
}
