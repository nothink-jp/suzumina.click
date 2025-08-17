import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getUserByDiscordId } from "@/lib/user-firestore";
import { UnifiedSettingsContent } from "./components/UnifiedSettingsContent";

export const metadata = {
	title: "設定",
	description: "アカウント設定とサイトの動作設定を管理できます。",
	keywords: ["設定", "年齢制限", "Cookie", "プライバシー", "プロフィール", "suzumina.click"],
	openGraph: {
		title: "設定 | すずみなくりっく！",
		description: "アカウント設定とサイトの動作設定を管理できます。",
		url: "https://suzumina.click/settings",
	},
	alternates: {
		canonical: "/settings",
	},
};

export default async function SettingsPage() {
	const session = await auth();

	if (!session?.user?.discordId) {
		redirect("/auth/signin");
	}

	const user = await getUserByDiscordId(session.user.discordId);
	if (!user) {
		redirect("/auth/signin");
	}

	return <UnifiedSettingsContent user={user} />;
}
