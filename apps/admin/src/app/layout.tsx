import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import "@suzumina.click/ui/globals.css";
import { NextAuthSessionProvider } from "@/providers/session-provider";

const notoSansJp = Noto_Sans_JP({
	subsets: ["latin"],
	display: "swap",
});

export const metadata: Metadata = {
	title: "suzumina.click 管理者",
	description: "涼花みなせファンコミュニティ 管理システム",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="ja" className={notoSansJp.className}>
			<body className="min-h-screen bg-background font-sans antialiased">
				<NextAuthSessionProvider>{children}</NextAuthSessionProvider>
			</body>
		</html>
	);
}
