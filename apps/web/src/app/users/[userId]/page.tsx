import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { getAudioButtonsByUser } from "@/lib/audio-buttons-firestore";
import { getUserFavoritesCount } from "@/lib/favorites-firestore";
import { getUserByDiscordId } from "@/lib/user-firestore";
import { UserProfileContent } from "./components/UserProfileContent";

interface UserProfilePageProps {
	params: Promise<{
		userId: string;
	}>;
}

export async function generateMetadata({ params }: UserProfilePageProps): Promise<Metadata> {
	try {
		const resolvedParams = await params;
		const user = await getUserByDiscordId(resolvedParams.userId);
		if (!user) {
			return {
				title: "ユーザーが見つかりません | すずみなくりっく！",
				description: "指定されたユーザーが見つかりません。",
			};
		}

		return {
			title: `${user.displayName}のプロフィール | すずみなくりっく！`,
			description: `${user.displayName}さんの作成した音声ボタン${user.audioButtonsCount}個をチェック。涼花みなせファンコミュニティ suzumina.click`,
			openGraph: {
				title: `${user.displayName}のプロフィール`,
				description: `音声ボタン${user.audioButtonsCount}個、再生数${user.totalPlayCount}回`,
				images: user.avatarUrl ? [{ url: user.avatarUrl }] : undefined,
			},
		};
	} catch {
		return {
			title: "プロフィール | すずみなくりっく！",
			description: "ユーザープロフィールページ",
		};
	}
}

export default async function UserProfilePage({ params }: UserProfilePageProps) {
	const session = await auth();
	const resolvedParams = await params;

	// ユーザー情報を取得
	const user = await getUserByDiscordId(resolvedParams.userId);
	if (!user) {
		notFound();
	}

	// プライベートプロフィールのチェック
	const isOwnProfile = session?.user?.discordId === resolvedParams.userId;
	if (!user.isPublicProfile && !isOwnProfile) {
		notFound();
	}

	// 現在のユーザーの情報を取得（管理者権限確認用）
	let currentUser = null;
	if (session?.user?.discordId) {
		currentUser = await getUserByDiscordId(session.user.discordId);
	}
	const isAdmin = currentUser?.role === "admin";

	// ユーザーが作成した音声ボタンを取得
	const audioButtons = await getAudioButtonsByUser(resolvedParams.userId);

	// お気に入り数を取得（自分のプロフィールの場合のみ）
	let favoritesCount = 0;
	if (isOwnProfile) {
		favoritesCount = await getUserFavoritesCount(resolvedParams.userId);
	}

	return (
		<UserProfileContent
			user={user}
			audioButtons={audioButtons}
			isOwnProfile={isOwnProfile}
			favoritesCount={favoritesCount}
			isAdmin={isAdmin}
		/>
	);
}
