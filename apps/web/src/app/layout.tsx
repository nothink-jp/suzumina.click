import "./globals.css";
import type { Metadata } from "next";
import { auth } from "@/auth";
import { Providers } from "./providers";
import { GlobalLayout } from "@/components/GlobalLayout";

export const metadata: Metadata = {
  title: "すずみなふぁみりー",
  description: "すずみなふぁみりーのコミュニティサイト",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <html lang="ja">
      <body>
        <Providers session={session}>
          <GlobalLayout>
            {children}
          </GlobalLayout>
        </Providers>
      </body>
    </html>
  );
}
