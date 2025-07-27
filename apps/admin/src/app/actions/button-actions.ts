"use server";

import { auth } from "@/lib/auth";
import { getFirestore } from "@/lib/firestore";

export interface UpdateButtonData {
	title?: string;
	startTime?: number;
	endTime?: number;
	isPublic?: boolean;
}

export interface ActionResult {
	success: boolean;
	message: string;
	error?: string;
}

export async function updateAudioButton(
	buttonId: string,
	data: UpdateButtonData,
): Promise<ActionResult> {
	try {
		// 管理者権限確認
		const session = await auth();
		if (!session?.user?.isAdmin) {
			return {
				success: false,
				message: "認証が必要です",
				error: "Unauthorized",
			};
		}

		const firestore = getFirestore();
		const buttonRef = firestore.collection("audioButtons").doc(buttonId);

		// 音声ボタンの存在確認
		const buttonDoc = await buttonRef.get();
		if (!buttonDoc.exists) {
			return {
				success: false,
				message: "音声ボタンが見つかりません",
				error: "Audio button not found",
			};
		}

		// 更新可能なフィールドのみを抽出
		const updateData: Record<string, unknown> = {};
		if (data.title !== undefined) updateData.title = data.title;
		if (data.startTime !== undefined) updateData.startTime = Number(data.startTime);
		if (data.endTime !== undefined) updateData.endTime = Number(data.endTime);
		if (data.isPublic !== undefined) updateData.isPublic = Boolean(data.isPublic);

		// 更新日時を追加
		updateData.updatedAt = new Date();

		await buttonRef.update(updateData);

		return {
			success: true,
			message: "音声ボタン情報を更新しました",
		};
	} catch (error) {
		return {
			success: false,
			message: "音声ボタン情報の更新に失敗しました",
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

export async function deleteAudioButton(buttonId: string): Promise<ActionResult> {
	try {
		// 管理者権限確認
		const session = await auth();
		if (!session?.user?.isAdmin) {
			return {
				success: false,
				message: "認証が必要です",
				error: "Unauthorized",
			};
		}

		const firestore = getFirestore();

		// 音声ボタンの存在確認
		const buttonRef = firestore.collection("audioButtons").doc(buttonId);
		const buttonDoc = await buttonRef.get();
		if (!buttonDoc.exists) {
			return {
				success: false,
				message: "音声ボタンが見つかりません",
				error: "Audio button not found",
			};
		}

		// 関連するお気に入りも削除
		const favoritesQuery = await firestore
			.collectionGroup("favorites")
			.where("audioButtonId", "==", buttonId)
			.get();

		const batch = firestore.batch();

		// 音声ボタン削除
		batch.delete(buttonRef);

		// 関連お気に入り削除
		for (const favoriteDoc of favoritesQuery.docs) {
			batch.delete(favoriteDoc.ref);
		}

		await batch.commit();

		return {
			success: true,
			message: "音声ボタンを削除しました",
		};
	} catch (error) {
		return {
			success: false,
			message: "音声ボタンの削除に失敗しました",
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

export async function recalculateAudioButtonCounts(): Promise<{
	success: boolean;
	error?: string;
}> {
	try {
		// 管理者権限確認
		const session = await auth();
		if (!session?.user?.isAdmin) {
			return {
				success: false,
				error: "管理者権限が必要です",
			};
		}

		const firestore = getFirestore();

		// 全動画を取得
		const videosSnapshot = await firestore.collection("videos").get();

		let updatedCount = 0;
		const batch = firestore.batch();

		for (const videoDoc of videosSnapshot.docs) {
			// その動画の音声ボタン数を取得
			const buttonSnapshot = await firestore
				.collection("audioButtons")
				.where("sourceVideoId", "==", videoDoc.id)
				.where("isPublic", "==", true)
				.get();

			const count = buttonSnapshot.size;

			// 動画ドキュメントを更新
			batch.update(videoDoc.ref, {
				audioButtonCount: count,
				hasAudioButtons: count > 0,
				updatedAt: new Date().toISOString(),
			});

			updatedCount++;

			// バッチサイズ制限（500）に達したらコミット
			if (updatedCount % 500 === 0) {
				await batch.commit();
				// 新しいバッチを開始
				console.log(`Updated ${updatedCount} videos...`);
			}
		}

		// 残りをコミット
		if (updatedCount % 500 !== 0) {
			await batch.commit();
		}

		console.log(`Successfully updated audioButtonCount for ${updatedCount} videos`);
		return { success: true };
	} catch (error) {
		console.error("音声ボタン数再計算エラー", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "音声ボタン数の再計算に失敗しました",
		};
	}
}
