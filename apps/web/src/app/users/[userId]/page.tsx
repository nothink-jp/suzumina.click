import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getAudioButtonsByUser } from "@/lib/audio-buttons-firestore";
import { getUserByDiscordId } from "@/lib/user-firestore";
import { UserProfileContent } from "./components/UserProfileContent";

interface UserProfilePageProps {
	params: {
		userId: string;
	};
}

export async function generateMetadata({ params }: UserProfilePageProps): Promise<Metadata> {
	try {
		const user = await getUserByDiscordId(params.userId);
		if (!user) {
			return {
				title: "ユーザーが見つかりません | suzumina.click",
				description: "指定されたユーザーが見つかりません。",
			};
		}

		return {
			title: `${user.displayName}のプロフィール | suzumina.click`,
			description: `${user.displayName}さんの作成した音声ボタン${user.audioButtonsCount}個をチェック。涼花みなせファンコミュニティ suzumina.click`,
			openGraph: {
				title: `${user.displayName}のプロフィール`,
				description: `音声ボタン${user.audioButtonsCount}個、再生数${user.totalPlayCount}回`,
				images: user.avatarUrl ? [{ url: user.avatarUrl }] : undefined,
			},
		};
	} catch {
		return {
			title: "プロフィール | suzumina.click",
			description: "ユーザープロフィールページ",
		};
	}
}

export default async function UserProfilePage({ params }: UserProfilePageProps) {
	const session = await auth();

	// ユーザー情報を取得
	const user = await getUserByDiscordId(params.userId);
	if (!user) {
		notFound();
	}

	// プライベートプロフィールのチェック
	const isOwnProfile = session?.user?.discordId === params.userId;
	if (!user.isPublicProfile && !isOwnProfile) {
		notFound();
	}

	// ユーザーが作成した音声ボタンを取得
	const audioButtons = await getAudioButtonsByUser(params.userId);

	return <UserProfileContent user={user} audioButtons={audioButtons} isOwnProfile={isOwnProfile} />;
}
