/**
 * 音声ボタン関連のFirestore操作を提供するモジュール
 */

import type { Query } from "@google-cloud/firestore";
import {
	type AudioButtonPlainObject,
	type FirestoreAudioButtonData,
	type FirestoreServerAudioButtonData,
	type FrontendAudioButtonData,
	formatRelativeTime,
	fromFrontendAudioButtonData,
} from "@suzumina.click/shared-types";
import { getFirestore } from "./firestore";
import { error as logError } from "./logger";

/**
 * Format duration from start and end time
 */
function formatDuration(startTime: number, endTime?: number): string {
	const duration = (endTime || startTime) - startTime;

	// 0秒の場合は "再生" を返す
	if (duration === 0) {
		return "再生";
	}

	// 60秒未満の場合は "X秒" 形式
	if (duration < 60) {
		return `${Math.floor(duration)}秒`;
	}

	// 60秒以上の場合は "X:XX" 形式
	const minutes = Math.floor(duration / 60);
	const seconds = Math.floor(duration % 60);
	return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/**
 * Ensure date is converted to string
 */
function ensureDateString(date: string | Date | unknown): string {
	if (typeof date === "string") return date;
	if (date instanceof Date) return date.toISOString();
	return new Date().toISOString();
}

/**
 * Firestore音声ボタンデータをフロントエンド表示用に変換
 * @deprecated Use convertToAudioButtonPlainObject instead
 */
export function convertToFrontendAudioButton(
	data:
		| FirestoreAudioButtonData
		| (FirestoreAudioButtonData & { createdAt: Date; updatedAt: Date }),
): FrontendAudioButtonData {
	const createdAtStr = ensureDateString(data.createdAt);
	const updatedAtStr = ensureDateString(data.updatedAt);

	const frontendData: FrontendAudioButtonData = {
		id: data.id,
		title: data.title,
		tags: data.tags || [],
		sourceVideoId: data.sourceVideoId,
		sourceVideoTitle: data.sourceVideoTitle,
		sourceVideoThumbnailUrl: `https://img.youtube.com/vi/${data.sourceVideoId}/maxresdefault.jpg`,
		startTime: data.startTime,
		endTime: data.endTime || data.startTime,
		createdBy: data.createdBy,
		createdByName: data.createdByName,
		isPublic: data.isPublic,
		playCount: data.playCount,
		likeCount: data.likeCount,
		dislikeCount: data.dislikeCount || 0,
		favoriteCount: data.favoriteCount || 0,
		createdAt: createdAtStr,
		updatedAt: updatedAtStr,

		// 表示用の追加情報
		durationText: formatDuration(data.startTime, data.endTime || data.startTime),
		relativeTimeText: formatRelativeTime(createdAtStr),
	};

	return frontendData;
}

/**
 * Firestore音声ボタンデータをPlain Object形式に変換
 */
export function convertToAudioButtonPlainObject(
	data:
		| FirestoreServerAudioButtonData
		| FirestoreAudioButtonData
		| (FirestoreAudioButtonData & { createdAt: Date; updatedAt: Date }),
): AudioButtonPlainObject {
	const createdAtStr = ensureDateString(data.createdAt);
	const updatedAtStr = ensureDateString(data.updatedAt);

	// Calculate computed properties
	const viewCount = data.playCount || 0;
	const likeCount = data.likeCount || 0;
	const dislikeCount = data.dislikeCount || 0;

	// Calculate engagement metrics
	const totalEngagements = likeCount + dislikeCount;
	const engagementRate = viewCount > 0 ? totalEngagements / viewCount : 0;
	const engagementRatePercentage = Math.round(engagementRate * 100);

	// Calculate popularity score
	const popularityScore = viewCount + likeCount * 2 - dislikeCount;

	// Check if popular (threshold: 100+ views or 50+ engagements)
	const isPopular = viewCount >= 100 || totalEngagements >= 50;

	// Build searchable text
	const searchableText = [
		data.title.toLowerCase(),
		...(data.tags || []).map((tag) => tag.toLowerCase()),
		(data.sourceVideoTitle || "").toLowerCase(),
		(data.createdByName || "").toLowerCase(),
	].join(" ");

	return {
		id: data.id,
		title: data.title,
		description: data.description,
		tags: data.tags || [],
		sourceVideoId: data.sourceVideoId,
		sourceVideoTitle: data.sourceVideoTitle,
		sourceVideoThumbnailUrl:
			data.sourceVideoThumbnailUrl ||
			`https://img.youtube.com/vi/${data.sourceVideoId}/maxresdefault.jpg`,
		startTime: data.startTime,
		endTime: data.endTime || data.startTime,
		createdBy: data.createdBy,
		createdByName: data.createdByName,
		isPublic: data.isPublic,
		playCount: viewCount,
		likeCount: likeCount,
		dislikeCount: dislikeCount,
		favoriteCount: data.favoriteCount || 0,
		createdAt: createdAtStr,
		updatedAt: updatedAtStr,
		_computed: {
			isPopular,
			engagementRate,
			engagementRatePercentage,
			popularityScore,
			searchableText,
			durationText: formatDuration(data.startTime, data.endTime || data.startTime),
			relativeTimeText: formatRelativeTime(createdAtStr),
		},
	};
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
