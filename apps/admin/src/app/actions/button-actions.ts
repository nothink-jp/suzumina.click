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
