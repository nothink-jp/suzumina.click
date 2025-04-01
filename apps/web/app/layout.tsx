import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "suzumina.click",
  description: "suzumina.click website",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
