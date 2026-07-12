import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/server";
import { getUserByDiscordId } from "@/lib/user-firestore";
import { UnifiedSettingsContent } from "./components/unified-settings-content";

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
	const currentUser = await getCurrentUser();

	if (!currentUser?.discordId) {
		redirect(`/auth/signin?callbackUrl=${encodeURIComponent("/settings")}`);
	}

	const user = await getUserByDiscordId(currentUser.discordId);
	if (!user) {
		redirect(`/auth/signin?callbackUrl=${encodeURIComponent("/settings")}`);
	}

	return <UnifiedSettingsContent user={user} />;
}
