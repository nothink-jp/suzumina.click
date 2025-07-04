import { type NextRequest, NextResponse } from "next/server";
import { getFirestore } from "@/lib/firestore";

/**
 * 特定ユーザーの特定お気に入りを削除
 */
export async function DELETE(
	_request: NextRequest,
	{ params }: { params: Promise<{ userId: string; audioButtonId: string }> },
): Promise<NextResponse> {
	try {
		const { userId, audioButtonId } = await params;

		if (!userId || !audioButtonId) {
			return NextResponse.json(
				{ error: "User ID and Audio Button ID are required" },
				{ status: 400 },
			);
		}

		const db = getFirestore();

		// お気に入りを検索して削除
		const favoritesSnapshot = await db
			.collection("users")
			.doc(userId)
			.collection("favorites")
			.where("audioButtonId", "==", audioButtonId)
			.get();

		if (favoritesSnapshot.empty) {
			return NextResponse.json({ error: "お気に入りが見つかりません" }, { status: 404 });
		}

		// 該当するお気に入りを削除
		const batch = db.batch();
		favoritesSnapshot.docs.forEach((doc) => {
			batch.delete(doc.ref);
		});
		await batch.commit();

		// 音声ボタンの統計を更新（お気に入り数を減らす）
		try {
			const audioButtonRef = db.collection("audioButtons").doc(audioButtonId);
			const audioButtonDoc = await audioButtonRef.get();

			if (audioButtonDoc.exists) {
				const currentStats = audioButtonDoc.data()?.statistics || {};
				const currentFavoriteCount = currentStats.favoriteCount || 0;

				await audioButtonRef.update({
					"statistics.favoriteCount": Math.max(0, currentFavoriteCount - 1),
					updatedAt: new Date().toISOString(),
				});
			}
		} catch (error) {
			console.warn("Failed to update audio button statistics:", error);
		}

		return NextResponse.json({
			message: "お気に入りを削除しました",
			userId,
			audioButtonId,
		});
	} catch (error) {
		console.error("Error deleting favorite:", error);
		return NextResponse.json({ error: "お気に入りの削除に失敗しました" }, { status: 500 });
	}
}
