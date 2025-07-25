/**
 * AudioButton Entity V2対応のサーバーアクション
 *
 * AudioButtonV2エンティティを使用したサーバーサイドの操作を提供します。
 * 既存のfavorites.ts、likes.ts、dislikes.tsとの共存を考慮。
 */

"use server";

import {
	AudioButtonV2,
	type FirestoreAudioButtonSchema,
	type FrontendAudioButtonData,
} from "@suzumina.click/shared-types";
import { auth } from "@/auth";
import { db } from "@/lib/firebase-admin";

/**
 * 単一AudioButton取得のレスポンス型
 */
export interface GetAudioButtonV2Response {
	success: boolean;
	audioButton?: AudioButtonV2;
	error?: string;
}

/**
 * 複数AudioButton取得のレスポンス型
 */
export interface GetAudioButtonsV2Response {
	success: boolean;
	audioButtons?: AudioButtonV2[];
	error?: string;
}

/**
 * AudioButtonをAudioButtonV2エンティティとして取得
 *
 * @param audioButtonId - 取得するAudioButtonのID
 * @returns AudioButtonV2エンティティまたはエラー
 */
export async function getAudioButtonV2Action(
	audioButtonId: string,
): Promise<GetAudioButtonV2Response> {
	try {
		// 入力値検証
		if (!audioButtonId || typeof audioButtonId !== "string") {
			return { success: false, error: "有効な音声ボタンIDが必要です" };
		}

		// Firestoreから音声ボタンデータを取得
		const doc = await db.collection("audioButtons").doc(audioButtonId).get();
		if (!doc.exists) {
			return { success: false, error: "音声ボタンが見つかりません" };
		}

		const data = doc.data() as FirestoreAudioButtonSchema;

		// FrontendAudioButtonDataに変換
		const frontendData: FrontendAudioButtonData = {
			id: doc.id,
			...data,
			createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
			updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
		};

		// AudioButtonV2エンティティに変換
		const audioButtonV2 = AudioButtonV2.fromLegacy(frontendData);

		return {
			success: true,
			audioButton: audioButtonV2,
		};
	} catch (error) {
		console.error("Error in getAudioButtonV2Action:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "音声ボタンの取得に失敗しました",
		};
	}
}

/**
 * 複数のAudioButtonをAudioButtonV2エンティティとして取得
 *
 * @param audioButtonIds - 取得するAudioButtonのID配列
 * @returns AudioButtonV2エンティティの配列またはエラー
 */
export async function getAudioButtonsV2Action(
	audioButtonIds: string[],
): Promise<GetAudioButtonsV2Response> {
	try {
		// 入力値検証
		if (!Array.isArray(audioButtonIds)) {
			return { success: false, error: "音声ボタンIDの配列が必要です" };
		}

		if (audioButtonIds.length === 0) {
			return { success: true, audioButtons: [] };
		}

		// 重複を除去
		const uniqueIds = [...new Set(audioButtonIds)];

		// バッチサイズ制限（Firestoreの制限に合わせて30件）
		if (uniqueIds.length > 30) {
			return { success: false, error: "一度に取得できる音声ボタンは30件までです" };
		}

		// Firestoreから音声ボタンデータを取得
		const audioButtonsPromises = uniqueIds.map(async (id) => {
			const doc = await db.collection("audioButtons").doc(id).get();
			if (!doc.exists) return null;

			const data = doc.data() as FirestoreAudioButtonSchema;
			const frontendData: FrontendAudioButtonData = {
				id: doc.id,
				...data,
				createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
				updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
			};

			return AudioButtonV2.fromLegacy(frontendData);
		});

		const results = await Promise.all(audioButtonsPromises);
		const audioButtons = results.filter((ab): ab is AudioButtonV2 => ab !== null);

		return {
			success: true,
			audioButtons,
		};
	} catch (error) {
		console.error("Error in getAudioButtonsV2Action:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "音声ボタンの取得に失敗しました",
		};
	}
}

/**
 * 公開音声ボタンの一覧を取得（V2エンティティ版）
 *
 * @param limit - 取得件数制限（デフォルト: 20）
 * @returns AudioButtonV2エンティティの配列
 */
export async function getPublicAudioButtonsV2Action(
	limit = 20,
): Promise<GetAudioButtonsV2Response> {
	try {
		// バリデーション
		if (limit < 1 || limit > 100) {
			return { success: false, error: "取得件数は1〜100の間で指定してください" };
		}

		// 公開音声ボタンを取得
		const snapshot = await db
			.collection("audioButtons")
			.where("isPublic", "==", true)
			.orderBy("createdAt", "desc")
			.limit(limit)
			.get();

		const audioButtons: AudioButtonV2[] = [];

		snapshot.forEach((doc) => {
			const data = doc.data() as FirestoreAudioButtonSchema;
			const frontendData: FrontendAudioButtonData = {
				id: doc.id,
				...data,
				createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
				updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
			};

			audioButtons.push(AudioButtonV2.fromLegacy(frontendData));
		});

		return {
			success: true,
			audioButtons,
		};
	} catch (error) {
		console.error("Error in getPublicAudioButtonsV2Action:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "音声ボタンの取得に失敗しました",
		};
	}
}

/**
 * AudioButtonの統計情報を更新（再生回数記録）
 *
 * @param audioButtonId - 更新するAudioButtonのID
 * @returns 更新結果
 */
export async function recordAudioButtonPlayV2Action(
	audioButtonId: string,
): Promise<{ success: boolean; error?: string }> {
	try {
		// 入力値検証
		if (!audioButtonId || typeof audioButtonId !== "string") {
			return { success: false, error: "有効な音声ボタンIDが必要です" };
		}

		// Firestoreのトランザクションで再生回数を更新
		await db.runTransaction(async (transaction) => {
			const docRef = db.collection("audioButtons").doc(audioButtonId);
			const doc = await transaction.get(docRef);

			if (!doc.exists) {
				throw new Error("音声ボタンが見つかりません");
			}

			const currentData = doc.data() as FirestoreAudioButtonSchema;
			const currentPlayCount = currentData.playCount || 0;

			transaction.update(docRef, {
				playCount: currentPlayCount + 1,
				updatedAt: new Date(),
			});
		});

		return { success: true };
	} catch (error) {
		console.error("Error in recordAudioButtonPlayV2Action:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "再生回数の記録に失敗しました",
		};
	}
}

/**
 * 認証が必要なAudioButton操作の例
 * 作成・更新・削除などの機能は管理画面で実装済みのため、
 * ここでは将来的な拡張のための枠組みのみ提供
 */
export async function updateAudioButtonV2Action(
	audioButtonId: string,
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	_updates: Partial<AudioButtonV2>,
): Promise<{ success: boolean; error?: string }> {
	try {
		// 認証チェック
		const session = await auth();
		if (!session?.user?.discordId) {
			return { success: false, error: "ログインが必要です" };
		}

		// 管理者権限チェック
		if (session.user.role !== "admin") {
			return { success: false, error: "この操作には管理者権限が必要です" };
		}

		// TODO: 実際の更新処理は後のPRで実装
		// 現時点では枠組みのみ

		return { success: true };
	} catch (error) {
		console.error("Error in updateAudioButtonV2Action:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "音声ボタンの更新に失敗しました",
		};
	}
}
