/**
 * 音声ボタン関連のFirestore操作を提供するモジュール
 */

import type { Query } from "@google-cloud/firestore";
import {
	type FirestoreAudioButtonData,
	type FrontendAudioButtonData,
	FrontendAudioButtonSchema,
	formatRelativeTime,
} from "@suzumina.click/shared-types";
import { getFirestore } from "./firestore";
import { error as logError } from "./logger";

/**
 * Firestore音声ボタンデータをフロントエンド表示用に変換
 */
export function convertToFrontendAudioButton(
	data: FirestoreAudioButtonData,
): FrontendAudioButtonData {
	// Duration calculation helper
	const formatDuration = (startTime: number, endTime?: number) => {
		const duration = endTime ? endTime - startTime : 0;
		if (duration <= 0) return "再生";
		if (duration < 60) return `${duration}秒`;
		const minutes = Math.floor(duration / 60);
		const seconds = duration % 60;
		return `${minutes}:${seconds.toString().padStart(2, "0")}`;
	};

	const frontendData: FrontendAudioButtonData = {
		id: data.id,
		title: data.title,
		tags: data.tags || [],
		sourceVideoId: data.sourceVideoId,
		sourceVideoTitle: data.sourceVideoTitle,
		sourceVideoThumbnailUrl: `https://img.youtube.com/vi/${data.sourceVideoId}/maxresdefault.jpg`,
		startTime: data.startTime,
		endTime: data.endTime,
		createdBy: data.createdBy,
		createdByName: data.createdByName,
		isPublic: data.isPublic,
		playCount: data.playCount,
		likeCount: data.likeCount,
		dislikeCount: data.dislikeCount || 0,
		favoriteCount: data.favoriteCount || 0,
		createdAt: data.createdAt,
		updatedAt: data.updatedAt,

		// 表示用の追加情報
		durationText: formatDuration(data.startTime, data.endTime),
		relativeTimeText: formatRelativeTime(data.createdAt),
	};

	try {
		return FrontendAudioButtonSchema.parse(frontendData);
	} catch (_error) {
		throw new Error("音声ボタンデータの形式が無効です");
	}
}

/**
 * 特定ユーザーが作成した音声ボタンを取得
 */
export async function getAudioButtonsByUser(
	discordId: string,
	options: {
		limit?: number;
		onlyPublic?: boolean;
		orderBy?: "newest" | "oldest" | "mostPlayed";
	} = {},
): Promise<FrontendAudioButtonData[]> {
	try {
		const firestore = getFirestore();
		const { limit = 20, onlyPublic = true, orderBy = "newest" } = options;

		let snapshot: FirebaseFirestore.QuerySnapshot;

		try {
			// まず最適化されたクエリを試行
			let query: Query = firestore.collection("audioButtons").where("createdBy", "==", discordId);

			// デフォルトは作成日順のソートのみ（最もシンプルなインデックス）
			if (orderBy === "newest" || orderBy === "oldest") {
				const direction = orderBy === "newest" ? "desc" : "asc";
				query = query.orderBy("createdAt", direction);
			}

			// 制限を大きめに設定して、後でフィルタリング
			query = query.limit(limit * 2);

			snapshot = await query.get();
		} catch (indexError) {
			// インデックスエラーの場合、最もシンプルなクエリにフォールバック
			logError("Index error, falling back to simple query:", {
				discordId,
				indexError: indexError instanceof Error ? indexError.message : String(indexError),
			});

			const simpleQuery = firestore.collection("audioButtons").where("createdBy", "==", discordId);
			snapshot = await simpleQuery.get();
		}
		let audioButtons = snapshot.docs
			.map((doc) => {
				try {
					const data = doc.data() as FirestoreAudioButtonData;
					return convertToFrontendAudioButton({ ...data, id: doc.id });
				} catch (conversionError) {
					logError("Failed to convert audio button data:", {
						docId: doc.id,
						error:
							conversionError instanceof Error ? conversionError.message : String(conversionError),
					});
					return null;
				}
			})
			.filter((button): button is FrontendAudioButtonData => button !== null)
			.filter((button) => {
				// 公開のみのフィルター（クライアント側で適用）
				if (onlyPublic && !button.isPublic) {
					return false;
				}
				return true;
			});

		// クライアント側でソート（フォールバック時や再生数順の場合）
		switch (orderBy) {
			case "newest":
				audioButtons.sort(
					(a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
				);
				break;
			case "oldest":
				audioButtons.sort(
					(a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
				);
				break;
			case "mostPlayed":
				audioButtons.sort((a, b) => (b.playCount || 0) - (a.playCount || 0));
				break;
		}

		// 最終的な制限を適用
		audioButtons = audioButtons.slice(0, limit);

		return audioButtons;
	} catch (error) {
		// エラーログを詳細に出力
		logError("getAudioButtonsByUser error:", {
			discordId,
			options,
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
		});
		throw new Error("音声ボタン一覧の取得に失敗しました");
	}
}

/**
 * 音声ボタンの再生回数を増加
 */
export async function incrementPlayCount(audioButtonId: string): Promise<void> {
	try {
		const firestore = getFirestore();
		const docRef = firestore.collection("audioButtons").doc(audioButtonId);

		await docRef.update({
			// biome-ignore lint/suspicious/noExplicitAny: Firestore FieldValue typing limitation
			playCount: (firestore as any).FieldValue.increment(1),
			updatedAt: new Date().toISOString(),
		});
	} catch (_error) {
		// 再生回数更新の失敗は致命的ではないため、エラーを投げない
	}
}

/**
 * ユーザーの音声ボタン統計を取得
 */
export async function getUserAudioButtonStats(discordId: string): Promise<{
	totalButtons: number;
	totalPlays: number;
	averagePlays: number;
	publicButtons: number;
}> {
	try {
		const firestore = getFirestore();

		// ユーザーの全音声ボタンを取得
		const allButtonsQuery = firestore
			.collection("audioButtons")
			.where("createdBy", "==", discordId);

		const publicButtonsQuery = firestore
			.collection("audioButtons")
			.where("createdBy", "==", discordId)
			.where("isPublic", "==", true);

		const [allButtonsSnapshot, publicButtonsSnapshot] = await Promise.all([
			allButtonsQuery.get(),
			publicButtonsQuery.get(),
		]);

		const totalButtons = allButtonsSnapshot.size;
		const publicButtons = publicButtonsSnapshot.size;

		// 再生回数の合計を計算
		let totalPlays = 0;
		allButtonsSnapshot.docs.forEach((doc) => {
			const data = doc.data() as FirestoreAudioButtonData;
			totalPlays += data.playCount || 0;
		});

		const averagePlays = totalButtons > 0 ? Math.round(totalPlays / totalButtons) : 0;

		return {
			totalButtons,
			totalPlays,
			averagePlays,
			publicButtons,
		};
	} catch (_error) {
		return {
			totalButtons: 0,
			totalPlays: 0,
			averagePlays: 0,
			publicButtons: 0,
		};
	}
}
