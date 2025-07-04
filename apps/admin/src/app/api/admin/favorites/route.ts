import { type NextRequest, NextResponse } from "next/server";
import { getFirestore } from "@/lib/firestore";

/**
 * 全ユーザーのお気に入りを取得（ページネーション対応）
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
	try {
		const db = getFirestore();
		const { searchParams } = new URL(request.url);

		// ページネーションパラメータを取得
		const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10));
		const limit = Math.max(
			1,
			Math.min(Number.parseInt(searchParams.get("limit") || "100", 10), 500),
		);

		// 全ユーザーを取得
		const usersSnapshot = await db.collection("users").get();
		const allFavorites: any[] = [];

		// 各ユーザーのお気に入りを取得
		for (const userDoc of usersSnapshot.docs) {
			const userId = userDoc.id;
			const userData = userDoc.data();

			const favoritesSnapshot = await db
				.collection("users")
				.doc(userId)
				.collection("favorites")
				.orderBy("addedAt", "desc")
				.get();

			for (const favoriteDoc of favoritesSnapshot.docs) {
				const favoriteData = favoriteDoc.data();

				// 音声ボタンの情報を取得
				let audioButtonTitle = "不明な音声ボタン";
				try {
					const audioButtonDoc = await db
						.collection("audioButtons")
						.doc(favoriteData.audioButtonId)
						.get();

					if (audioButtonDoc.exists) {
						audioButtonTitle = audioButtonDoc.data()?.title || audioButtonTitle;
					}
				} catch (error) {
					console.warn(`Failed to fetch audio button ${favoriteData.audioButtonId}:`, error);
				}

				allFavorites.push({
					id: favoriteDoc.id,
					userId,
					userName: userData.username || "不明なユーザー",
					audioButtonId: favoriteData.audioButtonId,
					audioButtonTitle,
					addedAt: favoriteData.addedAt,
				});
			}
		}

		// 追加日時でソート
		allFavorites.sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime());

		// ページネーション計算
		const totalCount = allFavorites.length;
		const totalPages = Math.ceil(totalCount / limit);
		const currentPage = Math.max(1, Math.min(page, totalPages || 1));
		const offset = (currentPage - 1) * limit;

		// ページングされたデータを取得
		const favorites = allFavorites.slice(offset, offset + limit);

		return NextResponse.json({
			favorites,
			pagination: {
				currentPage,
				totalPages,
				totalCount,
				limit,
				hasNext: currentPage < totalPages,
				hasPrev: currentPage > 1,
			},
		});
	} catch (error) {
		console.error("Error fetching favorites:", error);
		return NextResponse.json({ error: "お気に入りの取得に失敗しました" }, { status: 500 });
	}
}
