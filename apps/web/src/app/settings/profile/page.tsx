import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { getUserByDiscordId } from "@/lib/user-firestore";
import { ProfileSettingsForm } from "./components/ProfileSettingsForm";

export const metadata = {
	title: "プロフィール設定 | suzumina.click",
	description: "プロフィール情報の編集",
};

export default async function ProfileSettingsPage() {
	const session = await auth();

	if (!session?.user?.discordId) {
		redirect("/auth/signin");
	}

	const user = await getUserByDiscordId(session.user.discordId);
	if (!user) {
		notFound();
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-suzuka-50/30 to-minase-50/30">
			<div className="container mx-auto px-4 py-8 max-w-2xl">
				<h1 className="text-3xl font-bold mb-6">プロフィール設定</h1>
				<ProfileSettingsForm user={user} />
			</div>
		</div>
	);
}
