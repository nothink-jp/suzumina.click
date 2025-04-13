import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import Header from "@/components/layout/Header"; // Header コンポーネントをインポート
import Footer from "@/components/layout/Footer"; // Footer コンポーネントをインポート
import "./globals.css";

// Noto Sans JP フォントを設定
const notoSansJp = Noto_Sans_JP({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "700"],
  variable: "--font-noto-sans-jp",
  display: "swap",
});

export const metadata: Metadata = {
  // TODO: より適切なタイトルと説明を設定する
  title: "涼花みなせ 非公式ファンサイト",
  description: "涼花みなせさんの活動を応援する非公式ファンサイトです。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" data-theme="light">
      <body
        className={`${notoSansJp.variable} antialiased flex flex-col min-h-screen`}
      >
        <Header />
        <main className="flex-grow">{children}</main>
        <Footer /> {/* Footer を配置 */}
      </body>
    </html>
  );
}
