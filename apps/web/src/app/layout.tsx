import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import { AuthProvider } from "@/lib/firebase/AuthProvider"; // AuthProvider をインポート
import AuthModal from "@/components/ui/AuthModal"; // 認証モーダルをインポート
import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import { Suspense } from "react"; // Suspenseをインポート
import "./globals.css";

// Noto Sans JP フォントを設定
const notoSansJp = Noto_Sans_JP({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "700"],
  variable: "--font-noto-sans-jp",
  display: "swap",
});

export const metadata: Metadata = {
  title: "すずみなくりっく！",
  description: "涼花みなせさんの活動を応援する非公式ファンサイトです。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" data-theme="light" className={notoSansJp.variable}>
      {/* suppressHydrationWarningを追加してブラウザ拡張機能によるクラス名の変更を許容 */}
      <body suppressHydrationWarning className="antialiased flex flex-col min-h-screen">
        <AuthProvider>
          <Header />
          <main className="flex-grow">{children}</main>
          <Footer />
          {/* 認証モーダルを追加 - useSearchParamsを使用するためSuspenseでラップ */}
          <Suspense fallback={null}>
            <AuthModal />
          </Suspense>
        </AuthProvider>
      </body>
    </html>
  );
}
