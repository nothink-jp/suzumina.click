import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/server";
import { getFavoritesList } from "./actions";
import FavoritesList from "./components/favorites-list";

export const metadata: Metadata = {
	title: "お気に入り",
	description: "お気に入り登録した音声ボタン一覧",
};

interface FavoritesPageProps {
	searchParams: Promise<{
		page?: string;
		sort?: string;
	}>;
}

export default async function FavoritesPage({ searchParams }: FavoritesPageProps) {
	const user = await getCurrentUser();
	if (!user?.discordId) {
		redirect("/auth/signin");
	}

	const params = await searchParams;
	const page = Number(params.page) || 1;
	const sort = params.sort || "newest";

	// 初期データの取得
	const initialData = await getFavoritesList({
		page,
		limit: 20,
		sort,
		userId: user.discordId,
	});

	return (
		<div className="container mx-auto px-4 py-8">
			<h1 className="text-3xl font-bold mb-8">お気に入り</h1>
			<FavoritesList initialData={initialData} userId={user.discordId} />
		</div>
	);
}
