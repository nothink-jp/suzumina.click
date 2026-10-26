/**
 * 音声ボタン関連のFirestore操作を提供するモジュール
 */

import { AggregateField } from "@google-cloud/firestore";
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

/** gRPC ステータス FAILED_PRECONDITION（Firestore が複合インデックス不足のときに返す） */
const FIRESTORE_FAILED_PRECONDITION = 9;

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
			// creatorId だけで全件取得して下の in-memory 処理に任せる。読み取りはユーザーのボタン数に比例する。
			// 一時障害（UNAVAILABLE 等）はフォールバックせず外側の catch へ流す
			if ((indexError as { code?: unknown } | null)?.code !== FIRESTORE_FAILED_PRECONDITION) {
				throw indexError;
			}
			logError("getAudioButtonsByUser: index error, falling back to simple query", {
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

/** ユーザーページに出す公開音声ボタンの統計 */
export interface UserPublicAudioButtonStats {
	count: number;
	totalPlays: number;
	maxPlays: number;
}

/**
 * 特定ユーザーの公開音声ボタンの統計（件数・総再生数・最高再生数）を取得
 *
 * 非公開ボタンは含めない（公開プロフィールに出すため）。件数と総再生数は Firestore の集計
 * （1,000 件ごとに 1 read）、最高再生数は limit(1) で取り、ボタン数に比例した読み取りをしない。
 * 複合インデックスは terraform の audiobuttons_creatorid_ispublic_stats_playcount_asc（集計）と
 * audiobuttons_creatorid_ispublic_stats_playcount_desc（最高再生数）が正本。
 * 集計は昇順 index でしか受けられない（SPR-381）
 */
export async function getUserPublicAudioButtonStats(
	discordId: string,
): Promise<UserPublicAudioButtonStats> {
	try {
		const firestore = getFirestore();
		const byCreator = firestore.collection("audioButtons").where("creatorId", "==", discordId);
		const publicByCreator = byCreator.where("isPublic", "==", true);

		try {
			const [aggregateSnapshot, topSnapshot] = await Promise.all([
				publicByCreator
					.aggregate({
						count: AggregateField.count(),
						totalPlays: AggregateField.sum("stats.playCount"),
					})
					.get(),
				publicByCreator.orderBy("stats.playCount", "desc").limit(1).get(),
			]);
			const { count, totalPlays } = aggregateSnapshot.data();
			const top = topSnapshot.docs[0]?.data() as AudioButtonDocument | undefined;
			return { count, totalPlays, maxPlays: top?.stats?.playCount ?? 0 };
		} catch (indexError) {
			// 複合インデックスが未作成・ビルド中（FAILED_PRECONDITION）だけは、creatorId の全件取得から
			// メモリ上で計算する。読み取りはユーザーのボタン数に比例する。一時障害は外側の catch へ流す
			if ((indexError as { code?: unknown } | null)?.code !== FIRESTORE_FAILED_PRECONDITION) {
				throw indexError;
			}
			logError("getUserPublicAudioButtonStats: index error, falling back to simple query", {
				discordId,
				indexError: indexError instanceof Error ? indexError.message : String(indexError),
			});
			const playCounts = (await byCreator.get()).docs
				.map((doc) => doc.data() as AudioButtonDocument)
				.filter((data) => data.isPublic)
				.map((data) => data.stats?.playCount || 0);
			return {
				count: playCounts.length,
				totalPlays: playCounts.reduce((sum, plays) => sum + plays, 0),
				maxPlays: playCounts.length > 0 ? Math.max(...playCounts) : 0,
			};
		}
	} catch (error) {
		logError("getUserPublicAudioButtonStats error:", {
			discordId,
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
		});
		throw new Error("音声ボタン統計の取得に失敗しました");
	}
}

/**
 * 動画の公開音声ボタンの開始秒を全件取得（作成・切り抜き画面の「作成済み」目印用）
 *
 * 目印は全件描くので件数で打ち切らない。startTime だけを select し、読み取りはその動画の
 * 公開ボタン数に比例する。一覧の Server Action（getAudioButtonsList）は limit に上限があるため、
 * 全件が要るこの用途はサーバー専用のこの関数に分けている（SPR-378）。
 * where は videoId == と isPublic == の等価のみで、getAudioButtonCount と同じ形（複合インデックス不要）
 */
export async function getPublicAudioButtonStartTimesByVideo(videoId: string): Promise<number[]> {
	try {
		const snapshot = await getFirestore()
			.collection("audioButtons")
			.where("videoId", "==", videoId)
			.where("isPublic", "==", true)
			.select("startTime")
			.get();
		return snapshot.docs
			.map((doc) => (doc.data() as Pick<AudioButtonDocument, "startTime">).startTime)
			.filter((startTime): startTime is number => typeof startTime === "number");
	} catch (error) {
		logError("getPublicAudioButtonStartTimesByVideo error:", {
			videoId,
			error: error instanceof Error ? error.message : String(error),
		});
		throw new Error("音声ボタンの開始位置の取得に失敗しました");
	}
}
