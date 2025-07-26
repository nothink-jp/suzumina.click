/**
 * AudioButton Entity対応のサーバーアクション
 *
 * AudioButtonエンティティを使用したサーバーサイドの操作を提供します。
 * 既存のfavorites.ts、likes.ts、dislikes.tsとの共存を考慮。
 */

"use server";

import {
	AudioButton,
	convertToFrontendAudioButton,
	type FirestoreAudioButtonData,
} from "@suzumina.click/shared-types";
import { auth } from "@/auth";
import { getFirestore } from "@/lib/firestore";

/**
 * 単一AudioButton取得のレスポンス型
 */
export interface GetAudioButtonResponse {
	success: boolean;
	audioButton?: AudioButton;
	error?: string;
}

/**
 * 複数AudioButton取得のレスポンス型
 */
export interface GetAudioButtonsResponse {
	success: boolean;
	audioButtons?: AudioButton[];
	error?: string;
}

/**
 * AudioButtonをAudioButtonエンティティとして取得
 *
 * @param audioButtonId - 取得するAudioButtonのID
 * @returns AudioButtonエンティティまたはエラー
 */
export async function getAudioButtonAction(audioButtonId: string): Promise<GetAudioButtonResponse> {
	try {
		// 入力値検証
		if (!audioButtonId || typeof audioButtonId !== "string") {
			return { success: false, error: "有効な音声ボタンIDが必要です" };
		}

		// Firestoreから音声ボタンデータを取得
		const firestore = getFirestore();
		const doc = await firestore.collection("audioButtons").doc(audioButtonId).get();
		if (!doc.exists) {
			return { success: false, error: "音声ボタンが見つかりません" };
		}

		const data = doc.data() as FirestoreAudioButtonData;

		// FirestoreデータをISO文字列に変換
		const firestoreDataWithISODates = {
			...data,
			id: doc.id,
			// biome-ignore lint/suspicious/noExplicitAny: Firestore Timestamp type handling
			createdAt: (data.createdAt as any)?.toDate?.()?.toISOString() || new Date().toISOString(),
			// biome-ignore lint/suspicious/noExplicitAny: Firestore Timestamp type handling
			updatedAt: (data.updatedAt as any)?.toDate?.()?.toISOString() || new Date().toISOString(),
		};

		// FrontendAudioButtonDataに変換
		const frontendData = convertToFrontendAudioButton(firestoreDataWithISODates);

		// AudioButtonエンティティに変換
		const audioButton = AudioButton.fromLegacy(frontendData);

		return {
			success: true,
			audioButton: audioButton,
		};
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : "音声ボタンの取得に失敗しました",
		};
	}
}

/**
 * 複数のAudioButtonをAudioButtonエンティティとして取得
 *
 * @param audioButtonIds - 取得するAudioButtonのID配列
 * @returns AudioButtonエンティティの配列またはエラー
 */
export async function getAudioButtonsAction(
	audioButtonIds: string[],
): Promise<GetAudioButtonsResponse> {
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
		const firestore = getFirestore();
		const audioButtonsPromises = uniqueIds.map(async (id) => {
			const doc = await firestore.collection("audioButtons").doc(id).get();
			if (!doc.exists) return null;

			const data = doc.data() as FirestoreAudioButtonData;
			const firestoreDataWithISODates = {
				...data,
				id: doc.id,
				// biome-ignore lint/suspicious/noExplicitAny: Firestore Timestamp type handling
				createdAt: (data.createdAt as any)?.toDate?.()?.toISOString() || new Date().toISOString(),
				// biome-ignore lint/suspicious/noExplicitAny: Firestore Timestamp type handling
				updatedAt: (data.updatedAt as any)?.toDate?.()?.toISOString() || new Date().toISOString(),
			};

			const frontendData = convertToFrontendAudioButton(firestoreDataWithISODates);

			return AudioButton.fromLegacy(frontendData);
		});

		const results = await Promise.all(audioButtonsPromises);
		const audioButtons = results.filter((ab): ab is AudioButton => ab !== null);

		return {
			success: true,
			audioButtons,
		};
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : "音声ボタンの取得に失敗しました",
		};
	}
}

/**
 * 公開音声ボタンの一覧を取得（エンティティ版）
 *
 * @param limit - 取得件数制限（デフォルト: 20）
 * @returns AudioButtonエンティティの配列
 */
export async function getPublicAudioButtonsAction(limit = 20): Promise<GetAudioButtonsResponse> {
	try {
		// バリデーション
		if (limit < 1 || limit > 100) {
			return { success: false, error: "取得件数は1〜100の間で指定してください" };
		}

		// 公開音声ボタンを取得
		const firestore = getFirestore();
		const snapshot = await firestore
			.collection("audioButtons")
			.where("isPublic", "==", true)
			.orderBy("createdAt", "desc")
			.limit(limit)
			.get();

		const audioButtons: AudioButton[] = [];

		// biome-ignore lint/suspicious/noExplicitAny: Firestore QueryDocumentSnapshot type
		snapshot.forEach((doc: any) => {
			const data = doc.data() as FirestoreAudioButtonData;
			const firestoreDataWithISODates = {
				...data,
				id: doc.id,
				// biome-ignore lint/suspicious/noExplicitAny: Firestore Timestamp type handling
				createdAt: (data.createdAt as any)?.toDate?.()?.toISOString() || new Date().toISOString(),
				// biome-ignore lint/suspicious/noExplicitAny: Firestore Timestamp type handling
				updatedAt: (data.updatedAt as any)?.toDate?.()?.toISOString() || new Date().toISOString(),
			};

			const frontendData = convertToFrontendAudioButton(firestoreDataWithISODates);

			audioButtons.push(AudioButton.fromLegacy(frontendData));
		});

		return {
			success: true,
			audioButtons,
		};
	} catch (error) {
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
export async function recordAudioButtonPlayAction(
	audioButtonId: string,
): Promise<{ success: boolean; error?: string }> {
	try {
		// 入力値検証
		if (!audioButtonId || typeof audioButtonId !== "string") {
			return { success: false, error: "有効な音声ボタンIDが必要です" };
		}

		// Firestoreのトランザクションで再生回数を更新
		const firestore = getFirestore();
		// biome-ignore lint/suspicious/noExplicitAny: Firestore Transaction type
		await firestore.runTransaction(async (transaction: any) => {
			const docRef = firestore.collection("audioButtons").doc(audioButtonId);
			const doc = await transaction.get(docRef);

			if (!doc.exists) {
				throw new Error("音声ボタンが見つかりません");
			}

			const currentData = doc.data() as FirestoreAudioButtonData;
			const currentPlayCount = currentData.playCount || 0;

			transaction.update(docRef, {
				playCount: currentPlayCount + 1,
				updatedAt: new Date(),
			});
		});

		return { success: true };
	} catch (error) {
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
export async function updateAudioButtonAction(
	_audioButtonId: string,
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	_updates: Partial<AudioButton>,
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
		return {
			success: false,
			error: error instanceof Error ? error.message : "音声ボタンの更新に失敗しました",
		};
	}
}
