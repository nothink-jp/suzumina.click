import "./globals.css";
import type { Metadata } from "next";
import { RootProvider } from "./RootProvider";
import { auth } from "@/auth";

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
        <RootProvider session={session}>
          {children}
        </RootProvider>
      </body>
    </html>
  );
}
