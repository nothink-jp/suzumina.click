import "./globals.css";
import { auth } from "@/auth";
import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";

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
        <AppShell userId={session?.user?.id}>
          {children}
        </AppShell>
      </body>
    </html>
  );
}
