import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { convertToFrontendAudioButton } from "@/lib/audio-buttons-firestore";
import { getAudioButtonsFromFavorites, getUserFavorites } from "@/lib/favorites-firestore";
import FavoritesList from "./components/FavoritesList";

export const metadata: Metadata = {
	title: "お気に入り | suzumina.click",
	description: "お気に入り登録した音声ボタン一覧",
};

interface FavoritesPageProps {
	searchParams: Promise<{
		page?: string;
		sort?: string;
	}>;
}

export default async function FavoritesPage({ searchParams }: FavoritesPageProps) {
	const session = await auth();
	if (!session?.user?.discordId) {
		redirect("/auth/signin");
	}

	const params = await searchParams;
	const orderBy = (params.sort as "newest" | "oldest") || "newest";

	// お気に入り一覧を取得
	const favoritesList = await getUserFavorites(session.user.discordId, {
		limit: 20,
		orderBy,
	});

	// 音声ボタンデータを取得
	const audioButtonsMap = await getAudioButtonsFromFavorites(favoritesList.favorites);

	// フロントエンド用に変換
	const audioButtons = favoritesList.favorites
		.map((fav) => {
			const audioButtonData = audioButtonsMap.get(fav.audioButtonId);
			if (!audioButtonData) return null;
			return convertToFrontendAudioButton(audioButtonData as any);
		})
		.filter((button) => button !== null);

	return (
		<div className="container mx-auto px-4 py-8">
			<h1 className="text-3xl font-bold mb-8">お気に入り</h1>
			<FavoritesList
				audioButtons={audioButtons}
				totalCount={audioButtons.length}
				currentSort={orderBy}
			/>
		</div>
	);
}
