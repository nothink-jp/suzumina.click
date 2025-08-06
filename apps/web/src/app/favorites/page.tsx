import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { fetchFavoriteAudioButtons } from "./actions";
import FavoritesList from "./components/FavoritesList";

export const metadata: Metadata = {
	title: "お気に入り | すずみなくりっく！",
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
	const page = Number(params.page) || 1;
	const sort = params.sort || "newest";

	// 初期データの取得
	const initialData = await fetchFavoriteAudioButtons({
		page,
		limit: 20,
		sort,
		userId: session.user.discordId,
	});

	return (
		<div className="container mx-auto px-4 py-8">
			<h1 className="text-3xl font-bold mb-8">お気に入り</h1>
			<FavoritesList initialData={initialData} userId={session.user.discordId} />
		</div>
	);
}
