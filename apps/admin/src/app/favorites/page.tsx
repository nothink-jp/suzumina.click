import type { Metadata } from "next";
import FavoritesList from "./components/FavoritesList";

export const metadata: Metadata = {
	title: "お気に入り管理 - 管理者ダッシュボード",
	description: "ユーザーのお気に入り音声ボタンを管理します",
};

export default function FavoritesPage() {
	return (
		<div className="container mx-auto px-4 py-8">
			<div className="mb-6">
				<h1 className="text-3xl font-bold text-gray-900 mb-2">お気に入り管理</h1>
				<p className="text-gray-600">ユーザーのお気に入り音声ボタンを表示・管理できます。</p>
			</div>
			<FavoritesList />
		</div>
	);
}
