import "./globals.css";
import { auth } from "@/auth";
import type { Metadata } from "next";
import { Navigation } from "@/components/Navigation";

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
        <div className="min-h-screen bg-gray-50">
          <Navigation userId={session?.user?.id} />
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
