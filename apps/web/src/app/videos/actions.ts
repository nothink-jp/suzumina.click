"use server";

/**
 * Server Actions for fetching video data from Firestore (ユーザー向け)
 */

import {
	type CollectionReference,
	type DocumentSnapshot,
	Timestamp,
} from "@google-cloud/firestore";
import {
	convertToFrontendVideo,
	type FirestoreServerVideoData,
	type FrontendVideoData,
	type VideoListResult,
} from "@suzumina.click/shared-types/src/video";
import { getFirestore } from "@/lib/firestore";

/**
 * ページネーション用のクエリを構築する関数（ユーザー向け）
 */
function buildUserPaginationQuery(
	videosRef: CollectionReference,
	params?: {
		page?: number;
		limit?: number;
		startAfterDocId?: string;
		year?: string;
		sort?: string;
	},
) {
	const limit = params?.limit || 12;
	const page = params?.page || 1;

	// ソート順の設定（デフォルトは新しい順）
	const sortOrder = params?.sort === "oldest" ? "asc" : "desc";
	let query = videosRef.orderBy("publishedAt", sortOrder);

	// 年代フィルタリング
	if (params?.year) {
		const year = Number.parseInt(params.year, 10);
		if (!Number.isNaN(year)) {
			const startOfYear = new Date(year, 0, 1); // 1月1日
			const endOfYear = new Date(year + 1, 0, 1); // 翌年の1月1日
			query = query
				.where("publishedAt", ">=", Timestamp.fromDate(startOfYear))
				.where("publishedAt", "<", Timestamp.fromDate(endOfYear));
		}
	}

	if (params?.startAfterDocId) {
		return { query, limit, useStartAfter: true, docId: params.startAfterDocId };
	}

	if (page > 1) {
		const offset = (page - 1) * limit;
		query = query.offset(offset);
	}

	return { query, limit, useStartAfter: false };
}

/**
 * Timestamp型をISO文字列に変換する関数
 */
function convertTimestampToISO(timestamp: unknown): string {
	return timestamp instanceof Timestamp
		? timestamp.toDate().toISOString()
		: new Date().toISOString();
}

/**
 * FirestoreサーバーデータをFirestoreデータ形式に変換する関数（ユーザー向け）
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: 多数のフィールド変換が必要なため許容
function transformServerDataToFirestoreData(doc: DocumentSnapshot, data: FirestoreServerVideoData) {
	return {
		id: doc.id,
		videoId: data.videoId || doc.id,
		title: data.title,
		description: data.description || "",
		channelId: data.channelId,
		channelTitle: data.channelTitle,
		publishedAt: convertTimestampToISO(data.publishedAt),
		thumbnailUrl: data.thumbnailUrl || "",
		lastFetchedAt: convertTimestampToISO(data.lastFetchedAt),
		videoType: data.videoType,
		liveBroadcastContent: data.liveBroadcastContent,
		// YouTube Content Details
		duration: data.duration,
		definition: data.definition,
		dimension: data.dimension,
		caption: data.caption,
		licensedContent: data.licensedContent,
		contentRating: data.contentRating,
		regionRestriction: data.regionRestriction,
		// YouTube Statistics
		statistics: data.statistics,
		// Live Streaming Details
		liveStreamingDetails: data.liveStreamingDetails
			? {
					scheduledStartTime: data.liveStreamingDetails.scheduledStartTime
						? convertTimestampToISO(data.liveStreamingDetails.scheduledStartTime)
						: undefined,
					scheduledEndTime: data.liveStreamingDetails.scheduledEndTime
						? convertTimestampToISO(data.liveStreamingDetails.scheduledEndTime)
						: undefined,
					actualStartTime: data.liveStreamingDetails.actualStartTime
						? convertTimestampToISO(data.liveStreamingDetails.actualStartTime)
						: undefined,
					actualEndTime: data.liveStreamingDetails.actualEndTime
						? convertTimestampToISO(data.liveStreamingDetails.actualEndTime)
						: undefined,
					concurrentViewers: data.liveStreamingDetails.concurrentViewers,
				}
			: undefined,
		// Player Information
		player: data.player,
		// Recording Details
		recordingDetails: data.recordingDetails
			? {
					locationDescription: data.recordingDetails.locationDescription,
					recordingDate: data.recordingDetails.recordingDate
						? convertTimestampToISO(data.recordingDetails.recordingDate)
						: undefined,
				}
			: undefined,
		// Topic Details
		topicDetails: data.topicDetails,
		// Status Information
		status: data.status,
		// Category and Tags
		categoryId: data.categoryId,
		tags: data.tags,
		// Audio Button Information
		audioButtonCount: data.audioButtonCount || 0,
		hasAudioButtons: data.hasAudioButtons || false,
	};
}

/**
 * ドキュメントリストを処理してフロントエンド用動画データに変換する関数（ユーザー向け）
 */
function processUserVideoDocuments(
	docs: DocumentSnapshot[],
	limit: number,
	searchQuery?: string,
): FrontendVideoData[] {
	const videos: FrontendVideoData[] = [];
	const videosToProcess = docs.slice(0, limit);

	for (const doc of videosToProcess) {
		try {
			const data = doc.data() as FirestoreServerVideoData;

			// 検索クエリが指定されている場合、タイトルでフィルタリング
			if (searchQuery) {
				const lowerQuery = searchQuery.toLowerCase();
				const lowerTitle = data.title.toLowerCase();
				if (!lowerTitle.includes(lowerQuery)) {
					continue;
				}
			}

			const firestoreData = transformServerDataToFirestoreData(doc, data);
			const frontendVideo = convertToFrontendVideo(firestoreData);
			videos.push(frontendVideo);
		} catch (_error) {
			// 変換エラーは無視して次の動画を処理
		}
	}

	return videos;
}

/**
 * startAfter処理を実行するヘルパー関数
 */
async function applyStartAfterPagination(
	videosRef: CollectionReference,
	paginationConfig: ReturnType<typeof buildUserPaginationQuery>,
) {
	if (paginationConfig.useStartAfter && paginationConfig.docId) {
		const startAfterDoc = await videosRef.doc(paginationConfig.docId).get();
		if (startAfterDoc.exists) {
			paginationConfig.query = paginationConfig.query.startAfter(startAfterDoc);
		}
	}
}

/**
 * 検索用の全ドキュメントクエリを構築するヘルパー関数
 */
function buildSearchQuery(
	videosRef: CollectionReference,
	params: { year?: string; sort?: string },
) {
	let allDocsQuery = videosRef.orderBy("publishedAt", params?.sort === "oldest" ? "asc" : "desc");

	// 年代フィルタリングがある場合は適用
	if (params?.year) {
		const year = Number.parseInt(params.year, 10);
		if (!Number.isNaN(year)) {
			const startOfYear = new Date(year, 0, 1);
			const endOfYear = new Date(year + 1, 0, 1);
			allDocsQuery = allDocsQuery
				.where("publishedAt", ">=", Timestamp.fromDate(startOfYear))
				.where("publishedAt", "<", Timestamp.fromDate(endOfYear));
		}
	}

	return allDocsQuery;
}

/**
 * 検索結果を処理してページネーションを適用するヘルパー関数
 */
function processSearchResults(
	videosToProcess: DocumentSnapshot[],
	params: { search: string; page?: number },
	paginationConfig: { limit: number },
) {
	// 検索結果を取得してページネーション適用
	const allFilteredVideos = processUserVideoDocuments(
		videosToProcess,
		videosToProcess.length, // 全件処理
		params.search,
	);

	// ページネーション適用
	const startIndex = ((params?.page || 1) - 1) * paginationConfig.limit;
	const endIndex = startIndex + paginationConfig.limit;
	const videos = allFilteredVideos.slice(startIndex, endIndex);

	// 次のページがあるかどうかを判定
	const currentPage = params?.page || 1;
	const hasMore = currentPage * paginationConfig.limit < allFilteredVideos.length;

	return { videos, hasMore };
}

/**
 * 通常のページネーション結果を処理するヘルパー関数
 */
function processRegularResults(
	videosToProcess: DocumentSnapshot[],
	docs: DocumentSnapshot[],
	paginationConfig: { limit: number },
) {
	const videos = processUserVideoDocuments(videosToProcess, paginationConfig.limit, undefined);
	const hasMore = docs.length > paginationConfig.limit;
	return { videos, hasMore };
}

/**
 * Firestoreからビデオタイトル一覧を取得するServer Action（ユーザー向けページネーション対応）
 */
export async function getVideoTitles(params?: {
	page?: number;
	limit?: number;
	startAfterDocId?: string;
	year?: string;
	sort?: string;
	search?: string;
}): Promise<VideoListResult> {
	try {
		const firestore = getFirestore();
		const videosRef = firestore.collection("videos");
		const paginationConfig = buildUserPaginationQuery(videosRef, params);

		// startAfter処理
		await applyStartAfterPagination(videosRef, paginationConfig);

		// limit+1を取得して、次のページがあるかどうかを判定
		const snapshot = await paginationConfig.query.limit(paginationConfig.limit + 1).get();

		if (snapshot.empty) {
			return { videos: [], hasMore: false };
		}

		const docs = snapshot.docs;

		// 検索クエリがある場合、全ドキュメントを取得してフィルタリング
		let videosToProcess = docs;
		if (params?.search) {
			const allDocsQuery = buildSearchQuery(videosRef, params);
			const allDocsSnapshot = await allDocsQuery.limit(1000).get();
			videosToProcess = allDocsSnapshot.docs;
		}

		// 検索時は異なる処理が必要
		const { videos, hasMore } = params?.search
			? processSearchResults(
					videosToProcess,
					{ search: params.search, page: params.page },
					paginationConfig,
				)
			: processRegularResults(videosToProcess, docs, paginationConfig);

		const lastVideo = videos.length > 0 ? videos[videos.length - 1] : undefined;

		return {
			videos,
			hasMore,
			lastVideo,
		};
	} catch (_error) {
		return { videos: [], hasMore: false };
	}
}

/**
 * 総動画数を取得するServer Action
 * Note: count()クエリは権限問題があるため、通常のクエリで代替
 */
export async function getTotalVideoCount(params?: {
	year?: string;
	search?: string;
}): Promise<number> {
	try {
		const firestore = getFirestore();
		const videosRef = firestore.collection("videos");
		// 検索時はタイトルも必要なので、select()は使わない
		let query = params?.search ? videosRef : videosRef.select(); // IDのみ取得で効率化

		// 年代フィルタリング
		if (params?.year) {
			const year = Number.parseInt(params.year, 10);
			if (!Number.isNaN(year)) {
				const startOfYear = new Date(year, 0, 1);
				const endOfYear = new Date(year + 1, 0, 1);
				query = query
					.where("publishedAt", ">=", Timestamp.fromDate(startOfYear))
					.where("publishedAt", "<", Timestamp.fromDate(endOfYear));
			}
		}

		// 検索時は多くのドキュメントが必要になる可能性があるため、制限を設ける
		const snapshot = await query.limit(params?.search ? 1000 : 500).get();

		// 検索フィルタリング
		if (params?.search) {
			const lowerSearch = params.search.toLowerCase();
			let count = 0;
			for (const doc of snapshot.docs) {
				try {
					const data = doc.data() as FirestoreServerVideoData;
					const lowerTitle = data.title.toLowerCase();
					if (lowerTitle.includes(lowerSearch)) {
						count++;
					}
				} catch (_error) {
					// エラーは無視
				}
			}
			return count;
		}

		return snapshot.size;
	} catch (_error) {
		return 0;
	}
}

/**
 * 特定の動画IDで動画データを取得するServer Action
 * @param videoId - 動画ID
 * @returns 動画データまたはnull
 */
export async function getVideoById(videoId: string): Promise<FrontendVideoData | null> {
	try {
		const firestore = getFirestore();
		const doc = await firestore.collection("videos").doc(videoId).get();

		if (!doc.exists) {
			return null;
		}

		const data = doc.data() as FirestoreServerVideoData;
		const firestoreData = transformServerDataToFirestoreData(doc, data);
		const frontendData = convertToFrontendVideo(firestoreData);

		return frontendData;
	} catch (_error) {
		return null;
	}
}
