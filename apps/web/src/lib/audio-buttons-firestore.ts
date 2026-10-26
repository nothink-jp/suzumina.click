/**
 * 音声ボタン関連のFirestore操作を提供するモジュール
 */

import {
	type AudioButton,
	type AudioButtonDocument,
	formatRelativeTime,
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
 * Firestore音声ボタンデータをPlain Object形式に変換
 */
export function convertToAudioButtonPlainObject(
	data:
		| (AudioButtonDocument & { id?: string })
		| (AudioButtonDocument & { id?: string; createdAt: Date; updatedAt: Date }),
): AudioButton {
	const createdAtStr = ensureDateString(data.createdAt);
	const updatedAtStr = ensureDateString(data.updatedAt);

	// Calculate computed properties
	const viewCount = data.stats?.playCount || 0;
	const likeCount = data.stats?.likeCount || 0;
	const dislikeCount = data.stats?.dislikeCount || 0;

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
		data.buttonText.toLowerCase(),
		...(data.tags || []).map((tag: string) => tag.toLowerCase()),
		(data.videoTitle || "").toLowerCase(),
		(data.creatorName || "").toLowerCase(),
	].join(" ");

	return {
		id: data.id || "",
		buttonText: data.buttonText,
		tags: data.tags || [],
		videoId: data.videoId,
		videoTitle: data.videoTitle,
		videoThumbnailUrl:
			data.videoThumbnailUrl || `https://img.youtube.com/vi/${data.videoId}/maxresdefault.jpg`,
		startTime: data.startTime,
		endTime: data.endTime || data.startTime,
		duration: (data.endTime || data.startTime) - data.startTime,
		creatorId: data.creatorId,
		creatorName: data.creatorName,
		isPublic: data.isPublic,
		stats: {
			playCount: viewCount,
			likeCount: likeCount,
			dislikeCount: dislikeCount,
			favoriteCount: data.stats?.favoriteCount || 0,
			engagementRate: engagementRate,
		},
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
 * 特定ユーザーが作成した公開音声ボタンを新しい順に取得
 *
 * 非公開ボタンは常に除外する（呼び出し側から外せない＝SPR-379）。
 * 所有者向けに非公開を含める一覧が要るなら、認可付きの別関数として分ける。
 * 読み取りは表示件数（limit）に比例する。複合インデックスは
 * terraform の audiobuttons_creatorid_ispublic_createdat_desc が正本（SPR-380）
 */
export async function getAudioButtonsByUser(
	discordId: string,
	options: { limit?: number } = {},
): Promise<AudioButton[]> {
	const { limit = 20 } = options;
	try {
		const firestore = getFirestore();
		const byCreator = firestore.collection("audioButtons").where("creatorId", "==", discordId);

		let docs: FirebaseFirestore.QueryDocumentSnapshot[];
		try {
			const snapshot = await byCreator
				.where("isPublic", "==", true)
				.orderBy("createdAt", "desc")
				.limit(limit)
				.get();
			docs = snapshot.docs;
		} catch (indexError) {
			// 複合インデックスが未作成・ビルド中（FAILED_PRECONDITION）でも結果を欠けさせないため、
			// creatorId だけで全件取得して下の in-memory 処理に任せる。読み取りはユーザーのボタン数に比例する
			logError("Index error, falling back to simple query:", {
				discordId,
				indexError: indexError instanceof Error ? indexError.message : String(indexError),
			});
			docs = (await byCreator.get()).docs;
		}

		return (
			docs
				.map((doc) => {
					try {
						const data = doc.data() as AudioButtonDocument;
						return convertToAudioButtonPlainObject({ ...data, id: doc.id });
					} catch (conversionError) {
						logError("Failed to convert audio button data:", {
							docId: doc.id,
							error:
								conversionError instanceof Error
									? conversionError.message
									: String(conversionError),
						});
						return null;
					}
				})
				.filter((button): button is AudioButton => button !== null)
				// 正常経路では where 済み。フォールバック経路のためと fail-closed の二重防御
				.filter((button) => button.isPublic)
				.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
				.slice(0, limit)
		);
	} catch (error) {
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
			.where("creatorId", "==", discordId);

		const publicButtonsQuery = firestore
			.collection("audioButtons")
			.where("creatorId", "==", discordId)
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
			const data = doc.data() as AudioButtonDocument;
			totalPlays += data.stats?.playCount || 0;
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
