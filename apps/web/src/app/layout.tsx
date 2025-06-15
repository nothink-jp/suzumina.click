import type { Metadata } from "next";
import "@suzumina.click/ui/globals.css";

export const metadata: Metadata = {
  title: "suzumina.click - 涼花みなせファンサイト",
  description: "涼花みなせの音声ボタンとDLsite作品情報",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
