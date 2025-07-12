"use server";

import { FieldValue } from "@google-cloud/firestore";
import {
	type AudioButtonListResult,
	type AudioButtonQuery,
	AudioButtonQuerySchema,
	type CreateAudioButtonInput,
	CreateAudioButtonInputSchema,
	checkRateLimit,
	convertCreateInputToFirestoreAudioButton,
	convertToFrontendAudioButton,
	type FirestoreAudioButtonData,
	type FrontendAudioButtonData,
	filterAudioButtons,
	sortAudioButtons,
	type UpdateAudioButtonStats,
	UpdateAudioButtonStatsSchema,
	validateAudioButtonCreation,
	type YouTubeVideoInfo,
} from "@suzumina.click/shared-types";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/components/system/protected-route";
import { getFirestore } from "@/lib/firestore";
import * as logger from "@/lib/logger";
import { updateUserStats } from "@/lib/user-firestore";

/**
 * 音声ボタンを作成するServer Action
 */
export async function createAudioButton(
	input: CreateAudioButtonInput,
): Promise<{ success: true; data: { id: string } } | { success: false; error: string }> {
	try {
		logger.info("音声ボタン作成を開始", {
			sourceVideoId: input.sourceVideoId,
			startTime: input.startTime,
			endTime: input.endTime,
		});

		// 認証チェック
		const user = await requireAuth();

		// 入力データのバリデーション
		const validationResult = CreateAudioButtonInputSchema.safeParse(input);
		if (!validationResult.success) {
			logger.warn("入力データのバリデーション失敗", {
				errors: validationResult.error.errors,
				input,
			});
			return {
				success: false,
				error: `入力データが無効です: ${validationResult.error.errors.map((e) => e.message).join(", ")}`,
			};
		}

		const validatedInput = validationResult.data;

		// レート制限のためのユーザーベースチェック
		const firestore = getFirestore();
		const recentCreationsSnapshot = await firestore
			.collection("audioButtons")
			.where("createdBy", "==", user.discordId)
			.where("createdAt", ">", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
			.get();

		const recentCreations = recentCreationsSnapshot.docs.map((doc) => ({
			id: doc.id,
			...doc.data(),
		})) as FirestoreAudioButtonData[];

		const rateLimitCheck = checkRateLimit(recentCreations, user.discordId);
		if (!rateLimitCheck.allowed) {
			logger.warn("レート制限に引っかかりました", {
				userId: user.discordId,
				recentCreationsCount: recentCreations.length,
				resetTime: rateLimitCheck.resetTime,
			});
			return {
				success: false,
				error: `投稿制限に達しています。1日に作成できる音声ボタンは20個までです。リセット時間: ${rateLimitCheck.resetTime.toLocaleString()}`,
			};
		}

		const videoInfo = await fetchYouTubeVideoInfo(validatedInput.sourceVideoId);
		if (!videoInfo) {
			logger.warn("YouTube動画が見つかりません", {
				videoId: validatedInput.sourceVideoId,
			});
			return {
				success: false,
				error: "指定されたYouTube動画が見つからないか、アクセスできません",
			};
		}

		// 同じ動画の他の音声ボタンを取得して重複チェック
		const existingAudioButtonsQuery = await firestore
			.collection("audioButtons")
			.where("sourceVideoId", "==", validatedInput.sourceVideoId)
			.get();

		const existingButtons = existingAudioButtonsQuery.docs.map((doc) => ({
			id: doc.id,
			...doc.data(),
		})) as FirestoreAudioButtonData[];

		// バリデーション
		const validationError = validateAudioButtonCreation(
			validatedInput,
			videoInfo,
			user.discordId,
			existingButtons,
		);
		if (validationError) {
			logger.warn("音声ボタン作成バリデーション失敗", {
				error: validationError,
				videoId: validatedInput.sourceVideoId,
				startTime: validatedInput.startTime,
				endTime: validatedInput.endTime,
			});
			return {
				success: false,
				error: validationError,
			};
		}

		// Firestoreデータの作成（ユーザー情報付き）
		const firestoreData = convertCreateInputToFirestoreAudioButton(
			validatedInput,
			user.discordId,
			user.displayName,
		);

		// YouTube動画情報を追加
		firestoreData.sourceVideoTitle = videoInfo.title;

		const docRef = await firestore.collection("audioButtons").add(firestoreData);

		// ドキュメント作成後にIDフィールドを設定
		await docRef.update({ id: docRef.id });

		await updateVideoAudioButtonStats(validatedInput.sourceVideoId, {
			increment: true,
		});
		await updateUserStats(user.discordId, {
			incrementAudioButtons: true,
		});

		revalidatePath("/buttons");
		revalidatePath(`/buttons/${docRef.id}`); // 作成された音声ボタンの詳細ページもrevalidate
		revalidatePath(`/videos/${validatedInput.sourceVideoId}`);

		logger.info("音声ボタン作成が正常に完了", {
			documentId: docRef.id,
			userId: user.discordId,
			videoId: validatedInput.sourceVideoId,
			title: firestoreData.title,
		});

		return {
			success: true,
			data: { id: docRef.id },
		};
	} catch (error) {
		logger.error("音声ボタン作成でエラーが発生しました", {
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
			sourceVideoId: input.sourceVideoId,
			startTime: input.startTime,
			endTime: input.endTime,
		});

		return {
			success: false,
			error: "音声ボタンの作成に失敗しました。しばらく時間をおいてから再度お試しください。",
		};
	}
}

/**
 * 音声ボタンを検索・取得するServer Action
 */
export async function getAudioButtons(
	query: Partial<AudioButtonQuery> = {},
): Promise<{ success: true; data: AudioButtonListResult } | { success: false; error: string }> {
	try {
		// クエリのバリデーション
		const validationResult = AudioButtonQuerySchema.safeParse(query);
		if (!validationResult.success) {
			return {
				success: false,
				error: `検索条件が無効です: ${validationResult.error.errors.map((e) => e.message).join(", ")}`,
			};
		}

		const validatedQuery = validationResult.data;
		const firestore = getFirestore();

		// Firestoreクエリの構築
		const firestoreQuery = buildFirestoreQuery(firestore, validatedQuery);

		// 総件数の取得（フィルタあり・なしの両方）
		const _filteredCount = await getTotalCount(firestore, validatedQuery);
		const totalCount = await getAllCount(firestore); // フィルタなしの全件数

		// ページネーション設定
		const queryWithPagination = await applyPagination(firestoreQuery, validatedQuery, firestore);

		// データ取得
		const snapshot = await queryWithPagination.get();
		const docs = snapshot.docs;

		// hasMoreの判定とドキュメントの調整
		const { hasMore, audioButtonDocs } = determineHasMore(docs, validatedQuery);

		// データ変換とフィルタリング
		const audioButtons = processAudioButtons(audioButtonDocs, validatedQuery);

		// 実際のフィルタリング後の件数を取得（クライアントサイドフィルタリング考慮）
		const actualFilteredCount = await getActualFilteredCount(firestore, validatedQuery);

		// 結果の構築
		const result = buildResult(
			audioButtons,
			hasMore,
			validatedQuery,
			actualFilteredCount,
			totalCount,
		);

		return {
			success: true,
			data: result,
		};
	} catch (_error) {
		return {
			success: false,
			error: "音声ボタンの取得に失敗しました。",
		};
	}
}

// ヘルパー関数: Firestoreクエリ構築
function buildFirestoreQuery(
	firestore: ReturnType<typeof getFirestore>,
	validatedQuery: AudioButtonQuery,
) {
	let firestoreQuery = firestore.collection("audioButtons").where("isPublic", "==", true);

	// 動画IDフィルター
	if (validatedQuery.sourceVideoId) {
		firestoreQuery = firestoreQuery.where("sourceVideoId", "==", validatedQuery.sourceVideoId);
	}

	// 並び順の設定
	switch (validatedQuery.sortBy) {
		case "newest":
			firestoreQuery = firestoreQuery.orderBy("createdAt", "desc");
			break;
		case "oldest":
			firestoreQuery = firestoreQuery.orderBy("createdAt", "asc");
			break;
		case "popular":
			firestoreQuery = firestoreQuery.orderBy("likeCount", "desc");
			break;
		case "mostPlayed":
			firestoreQuery = firestoreQuery.orderBy("playCount", "desc");
			break;
		default:
			firestoreQuery = firestoreQuery.orderBy("createdAt", "desc");
	}

	return firestoreQuery;
}

// ヘルパー関数: 総件数取得
async function getTotalCount(
	firestore: ReturnType<typeof getFirestore>,
	validatedQuery: AudioButtonQuery,
): Promise<number | undefined> {
	if (!validatedQuery.includeTotalCount) {
		return undefined;
	}

	let countQuery = firestore.collection("audioButtons").where("isPublic", "==", true);
	if (validatedQuery.sourceVideoId) {
		countQuery = countQuery.where("sourceVideoId", "==", validatedQuery.sourceVideoId);
	}
	const countSnapshot = await countQuery.get();
	return countSnapshot.size;
}

// ヘルパー関数: 全件数取得（フィルタなし）
async function getAllCount(firestore: ReturnType<typeof getFirestore>): Promise<number> {
	const countQuery = firestore.collection("audioButtons").where("isPublic", "==", true);
	const countSnapshot = await countQuery.get();
	return countSnapshot.size;
}

// ヘルパー関数: 実際のフィルタリング後の件数を取得
async function getActualFilteredCount(
	firestore: ReturnType<typeof getFirestore>,
	validatedQuery: AudioButtonQuery,
): Promise<number> {
	if (!validatedQuery.includeTotalCount) {
		return 0;
	}

	// Firestoreクエリを構築（基本的なフィルタのみ）
	const firestoreQuery = buildFirestoreQuery(firestore, validatedQuery);

	// 全データを取得
	const snapshot = await firestoreQuery.get();
	const docs = snapshot.docs;

	// Firestoreデータをフロントエンド用に変換
	const allAudioButtons = docs.map((doc) => {
		const data = { id: doc.id, ...doc.data() } as FirestoreAudioButtonData;
		return convertToFrontendAudioButton(data);
	});

	// クライアントサイドフィルタリングを適用
	const filteredAudioButtons = filterAudioButtons(allAudioButtons, {
		searchText: validatedQuery.searchText,
		tags: validatedQuery.tags,
		playCountMin: validatedQuery.playCountMin,
		playCountMax: validatedQuery.playCountMax,
		likeCountMin: validatedQuery.likeCountMin,
		likeCountMax: validatedQuery.likeCountMax,
		favoriteCountMin: validatedQuery.favoriteCountMin,
		favoriteCountMax: validatedQuery.favoriteCountMax,
		durationMin: validatedQuery.durationMin,
		durationMax: validatedQuery.durationMax,
		createdAfter: validatedQuery.createdAfter,
		createdBefore: validatedQuery.createdBefore,
		createdBy: validatedQuery.createdBy,
	});

	return filteredAudioButtons.length;
}

// ヘルパー関数: ページネーション適用
async function applyPagination(
	firestoreQuery: FirebaseFirestore.Query,
	validatedQuery: AudioButtonQuery,
	firestore: ReturnType<typeof getFirestore>,
) {
	let query = firestoreQuery;

	if (validatedQuery.page) {
		// ページベースのページネーション
		const offset = (validatedQuery.page - 1) * validatedQuery.limit;
		query = query.offset(offset);
	} else if (validatedQuery.startAfter) {
		// カーソルベースのページネーション
		const startAfterDoc = await firestore
			.collection("audioButtons")
			.doc(validatedQuery.startAfter)
			.get();
		if (startAfterDoc.exists) {
			query = query.startAfter(startAfterDoc);
		}
	}

	// ページベースの場合はlimitのみ、カーソルベースの場合はlimit + 1
	const limitSize = validatedQuery.page ? validatedQuery.limit : validatedQuery.limit + 1;
	return query.limit(limitSize);
}

// ヘルパー関数: hasMoreの判定
function determineHasMore(
	docs: FirebaseFirestore.QueryDocumentSnapshot[],
	validatedQuery: AudioButtonQuery,
) {
	let hasMore = false;
	let audioButtonDocs = docs;

	if (validatedQuery.page) {
		// ページベースの場合
		hasMore = docs.length === validatedQuery.limit;
	} else {
		// カーソルベースの場合
		hasMore = docs.length > validatedQuery.limit;
		audioButtonDocs = hasMore ? docs.slice(0, -1) : docs;
	}

	return { hasMore, audioButtonDocs };
}

// ヘルパー関数: データ処理
function processAudioButtons(
	audioButtonDocs: FirebaseFirestore.QueryDocumentSnapshot[],
	validatedQuery: AudioButtonQuery,
) {
	// Firestore データをフロントエンド用に変換
	let audioButtons = audioButtonDocs.map((doc) => {
		const data = { id: doc.id, ...doc.data() } as FirestoreAudioButtonData;
		return convertToFrontendAudioButton(data);
	});

	// クライアントサイドフィルタリング（Firestoreでは対応できない条件）
	audioButtons = filterAudioButtons(audioButtons, {
		searchText: validatedQuery.searchText,
		tags: validatedQuery.tags,
		playCountMin: validatedQuery.playCountMin,
		playCountMax: validatedQuery.playCountMax,
		likeCountMin: validatedQuery.likeCountMin,
		likeCountMax: validatedQuery.likeCountMax,
		favoriteCountMin: validatedQuery.favoriteCountMin,
		favoriteCountMax: validatedQuery.favoriteCountMax,
		durationMin: validatedQuery.durationMin,
		durationMax: validatedQuery.durationMax,
		createdAfter: validatedQuery.createdAfter,
		createdBefore: validatedQuery.createdBefore,
		createdBy: validatedQuery.createdBy,
	});

	// クライアントサイド並び替え（複合条件の場合）
	if (validatedQuery.sortBy === "popular") {
		audioButtons = sortAudioButtons(audioButtons, "popular");
	}

	return audioButtons;
}

// ヘルパー関数: 結果構築
function buildResult(
	audioButtons: FrontendAudioButtonData[],
	hasMore: boolean,
	validatedQuery: AudioButtonQuery,
	filteredCount?: number,
	totalCount?: number,
): AudioButtonListResult {
	const currentPage = validatedQuery.page || 1;
	const totalPages = filteredCount ? Math.ceil(filteredCount / validatedQuery.limit) : undefined;

	return {
		audioButtons,
		hasMore,
		lastAudioButton: audioButtons.length > 0 ? audioButtons[audioButtons.length - 1] : undefined,
		totalCount,
		filteredCount,
		currentPage,
		totalPages,
	};
}

/**
 * 人気の音声ボタンを取得するServer Action
 */
export async function getPopularAudioButtons(limit = 6): Promise<FrontendAudioButtonData[]> {
	try {
		const result = await getAudioButtons({
			limit,
			sortBy: "popular",
			onlyPublic: true,
		});

		if (result.success) {
			return result.data.audioButtons;
		}

		return [];
	} catch (_error) {
		return [];
	}
}

/**
 * 最新の音声ボタンを取得するServer Action
 */
export async function getRecentAudioButtons(limit = 6): Promise<FrontendAudioButtonData[]> {
	try {
		const result = await getAudioButtons({
			limit,
			sortBy: "newest",
			onlyPublic: true,
		});

		if (result.success) {
			return result.data.audioButtons;
		}

		return [];
	} catch (_error) {
		return [];
	}
}

/**
 * 特定の動画の音声ボタン総件数を取得するServer Action
 */
export async function getAudioButtonCount(sourceVideoId: string): Promise<number> {
	try {
		const firestore = getFirestore();
		const snapshot = await firestore
			.collection("audioButtons")
			.where("isPublic", "==", true)
			.where("sourceVideoId", "==", sourceVideoId)
			.get();

		return snapshot.size;
	} catch (_error) {
		return 0;
	}
}

/**
 * カテゴリ別の音声ボタンを取得するServer Action
 */
// カテゴリー別取得は削除（タグベースシステムに移行）

/**
 * 音声ボタンの統計を更新するServer Action
 */
export async function updateAudioButtonStats(
	statsUpdate: Partial<UpdateAudioButtonStats> & { id: string },
): Promise<{ success: boolean; error?: string }> {
	try {
		// 認証チェック（統計更新は認証ユーザーのみ）
		// NOTE: 統計更新（再生回数など）は認証不要とする
		// await requireAuth();
		// バリデーション
		const validationResult = UpdateAudioButtonStatsSchema.safeParse(statsUpdate);
		if (!validationResult.success) {
			return {
				success: false,
				error: `統計更新データが無効です: ${validationResult.error.errors.map((e) => e.message).join(", ")}`,
			};
		}

		const validatedUpdate = validationResult.data;
		const firestore = getFirestore();

		// 更新データの作成
		const updateData: Record<string, unknown> = {
			updatedAt: new Date().toISOString(),
		};

		if (validatedUpdate.incrementPlayCount) {
			updateData.playCount = FieldValue.increment(1);
		}

		if (validatedUpdate.incrementLikeCount) {
			updateData.likeCount = FieldValue.increment(1);
		}

		if (validatedUpdate.decrementLikeCount) {
			updateData.likeCount = FieldValue.increment(-1);
		}

		// Firestoreを更新
		await firestore.collection("audioButtons").doc(validatedUpdate.id).update(updateData);

		// 再生回数が増加した場合、ユーザー統計も更新
		if (validatedUpdate.incrementPlayCount) {
			// 音声ボタンの作成者情報を取得
			const audioButtonDoc = await firestore
				.collection("audioButtons")
				.doc(validatedUpdate.id)
				.get();

			if (audioButtonDoc.exists) {
				const audioButtonData = audioButtonDoc.data() as FirestoreAudioButtonData;
				if (audioButtonData.createdBy) {
					await updateUserStats(audioButtonData.createdBy, {
						incrementPlayCount: 1,
					});
				}
			}
		}

		// 統計情報更新時はページリロードを避けるため、revalidatePathを削除
		// revalidatePath("/buttons");
		// revalidatePath(`/buttons/${validatedUpdate.id}`);

		return { success: true };
	} catch (_error) {
		return {
			success: false,
			error: "統計情報の更新に失敗しました。",
		};
	}
}

/**
 * 再生回数を増加させるServer Action
 */
export async function incrementPlayCount(
	id: string,
): Promise<{ success: boolean; error?: string }> {
	return await updateAudioButtonStats({
		id,
		incrementPlayCount: true,
	});
}

/**
 * いいね数を増加させるServer Action
 */
export async function incrementLikeCount(
	id: string,
): Promise<{ success: boolean; error?: string }> {
	return await updateAudioButtonStats({
		id,
		incrementLikeCount: true,
	});
}

/**
 * いいね数を減少させるServer Action
 */
export async function decrementLikeCount(
	id: string,
): Promise<{ success: boolean; error?: string }> {
	return await updateAudioButtonStats({
		id,
		decrementLikeCount: true,
	});
}

/**
 * IDによって音声ボタンを取得するServer Action
 */
export async function getAudioButtonById(
	id: string,
): Promise<{ success: true; data: FrontendAudioButtonData } | { success: false; error: string }> {
	try {
		if (!id || typeof id !== "string") {
			return {
				success: false,
				error: "音声ボタンIDが指定されていません",
			};
		}

		const firestore = getFirestore();
		const doc = await firestore.collection("audioButtons").doc(id).get();

		if (!doc.exists) {
			return {
				success: false,
				error: "指定された音声ボタンが見つかりません",
			};
		}

		const firestoreData = {
			id: doc.id,
			...doc.data(),
		} as FirestoreAudioButtonData;

		// プライベートな投稿の場合はエラー
		if (!firestoreData.isPublic) {
			return {
				success: false,
				error: "この音声ボタンは非公開です",
			};
		}

		// フロントエンド用に変換
		const frontendData = convertToFrontendAudioButton(firestoreData);

		return {
			success: true,
			data: frontendData,
		};
	} catch (error) {
		logger.error("getAudioButtonById failed", {
			id,
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
		});
		return {
			success: false,
			error: "音声ボタンの取得に失敗しました",
		};
	}
}

/**
 * YouTube動画情報を取得するヘルパー関数
 */
async function fetchYouTubeVideoInfo(videoId: string): Promise<YouTubeVideoInfo | null> {
	try {
		// YouTube Data API v3を使用して動画情報を取得
		// 実装は既存のYouTube関数と統合
		const API_KEY = process.env.YOUTUBE_API_KEY;
		if (!API_KEY) {
			return null;
		}

		const response = await fetch(
			`https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=snippet,contentDetails&key=${API_KEY}`,
		);

		if (!response.ok) {
			return null;
		}

		const data = await response.json();
		if (!data.items || data.items.length === 0) {
			return null;
		}

		const video = data.items[0];
		const snippet = video.snippet;
		const contentDetails = video.contentDetails;

		// ISO 8601期間をミリ秒に変換
		const duration = contentDetails?.duration ? parseDuration(contentDetails.duration) : undefined;

		return {
			id: videoId,
			title: snippet.title,
			channelTitle: snippet.channelTitle,
			thumbnailUrl: snippet.thumbnails?.maxresdefault?.url || snippet.thumbnails?.high?.url,
			duration: duration ? Math.floor(duration / 1000) : 0,
			publishedAt: snippet.publishedAt,
		};
	} catch (_error) {
		return null;
	}
}

/**
 * 動画の音声ボタン統計を更新するヘルパー関数
 */
async function updateVideoAudioButtonStats(
	videoId: string,
	options: { increment?: boolean; decrement?: boolean },
): Promise<void> {
	try {
		const firestore = getFirestore();

		// 既存の動画ドキュメントを取得
		const videoDoc = await firestore.collection("videos").doc(videoId).get();

		if (videoDoc.exists) {
			const updateData: {
				updatedAt: string;
				audioButtonCount?: ReturnType<typeof FieldValue.increment>;
			} = {
				updatedAt: new Date().toISOString(),
			};

			if (options.increment) {
				updateData.audioButtonCount = FieldValue.increment(1);
			}

			if (options.decrement) {
				updateData.audioButtonCount = FieldValue.increment(-1);
			}

			await firestore.collection("videos").doc(videoId).update(updateData);
		}
	} catch (_error) {
		// 非クリティカルなエラーなので続行
	}
}

/**
 * ISO 8601期間文字列を秒数に変換するヘルパー関数
 */
function parseDuration(duration: string): number {
	const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
	if (!match) {
		return 0;
	}

	const hours = Number.parseInt(match[1] || "0", 10);
	const minutes = Number.parseInt(match[2] || "0", 10);
	const seconds = Number.parseInt(match[3] || "0", 10);

	return (hours * 3600 + minutes * 60 + seconds) * 1000; // ミリ秒で返す
}

/**
 * 音声ボタンを削除するServer Action
 */
export async function deleteAudioButton(
	audioButtonId: string,
): Promise<{ success: boolean; error?: string }> {
	try {
		logger.info("音声ボタン削除を開始", { audioButtonId });

		// 認証チェック
		const user = await requireAuth();

		if (!audioButtonId || typeof audioButtonId !== "string") {
			return {
				success: false,
				error: "音声ボタンIDが指定されていません",
			};
		}

		const firestore = getFirestore();

		// 音声ボタンデータを取得して権限チェック
		const audioButtonDoc = await firestore.collection("audioButtons").doc(audioButtonId).get();

		if (!audioButtonDoc.exists) {
			return {
				success: false,
				error: "指定された音声ボタンが見つかりません",
			};
		}

		const audioButtonData = {
			id: audioButtonDoc.id,
			...audioButtonDoc.data(),
		} as FirestoreAudioButtonData;

		// 作成者または管理者のみ削除可能
		if (audioButtonData.createdBy !== user.discordId && user.role !== "admin") {
			logger.warn("削除権限なし", {
				audioButtonId,
				createdBy: audioButtonData.createdBy,
				requestUserId: user.discordId,
				userRole: user.role,
			});
			return {
				success: false,
				error: "この音声ボタンを削除する権限がありません",
			};
		}

		// 1. まずお気に入りから削除（トランザクション外）
		await deleteAudioButtonFromAllFavorites(audioButtonId);

		// 2. トランザクションで統計情報更新とメイン削除
		await firestore.runTransaction(async (transaction) => {
			// 統計情報の更新

			// 作成者の統計を更新
			const userRef = firestore.collection("users").doc(audioButtonData.createdBy);
			const userDoc = await transaction.get(userRef);
			if (userDoc.exists) {
				const updateData: {
					updatedAt: string;
					audioButtonsCount: ReturnType<typeof FieldValue.increment>;
					totalPlayCount?: ReturnType<typeof FieldValue.increment>;
				} = {
					updatedAt: new Date().toISOString(),
					audioButtonsCount: FieldValue.increment(-1),
				};

				// 再生回数も調整
				if (audioButtonData.playCount > 0) {
					updateData.totalPlayCount = FieldValue.increment(-audioButtonData.playCount);
				}

				transaction.update(userRef, updateData);
			}

			// 動画の統計を更新
			const videoRef = firestore.collection("videos").doc(audioButtonData.sourceVideoId);
			const videoDoc = await transaction.get(videoRef);
			if (videoDoc.exists) {
				transaction.update(videoRef, {
					updatedAt: new Date().toISOString(),
					audioButtonCount: FieldValue.increment(-1),
				});
			}

			// メインの音声ボタンドキュメントを削除
			const audioButtonRef = firestore.collection("audioButtons").doc(audioButtonId);
			transaction.delete(audioButtonRef);
		});

		// キャッシュの無効化
		revalidatePath("/buttons");
		revalidatePath(`/buttons/${audioButtonId}`);
		revalidatePath(`/videos/${audioButtonData.sourceVideoId}`);
		revalidatePath("/favorites");

		logger.info("音声ボタン削除が正常に完了", {
			audioButtonId,
			deletedBy: user.discordId,
			originalCreator: audioButtonData.createdBy,
		});

		return { success: true };
	} catch (error) {
		logger.error("音声ボタン削除でエラーが発生しました", {
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
			audioButtonId,
		});

		return {
			success: false,
			error: "音声ボタンの削除に失敗しました。しばらく時間をおいてから再度お試しください。",
		};
	}
}

/**
 * 全ユーザーのお気に入りから指定された音声ボタンを削除するヘルパー関数
 */
async function deleteAudioButtonFromAllFavorites(audioButtonId: string): Promise<void> {
	try {
		const firestore = getFirestore();

		// 効率的な削除のため、collection group queryを使用
		let favoritesSnapshot: FirebaseFirestore.QuerySnapshot;

		try {
			const favoritesQuery = firestore
				.collectionGroup("favorites")
				.where("audioButtonId", "==", audioButtonId);

			favoritesSnapshot = await favoritesQuery.get();
		} catch (_collectionGroupError) {
			// コレクショングループクエリが失敗した場合はスキップ
			return;
		}

		// お気に入りが0件の場合は早期リターン
		if (favoritesSnapshot.docs.length === 0) {
			return;
		}

		// バッチ処理で削除
		const batchSize = 500; // Firestoreの制限
		const batches = [];

		for (let i = 0; i < favoritesSnapshot.docs.length; i += batchSize) {
			const batch = firestore.batch();
			const batchDocs = favoritesSnapshot.docs.slice(i, i + batchSize);

			batchDocs.forEach((doc: FirebaseFirestore.QueryDocumentSnapshot) => {
				batch.delete(doc.ref);
			});

			batches.push(batch);
		}

		// 全バッチを実行
		await Promise.all(batches.map((batch) => batch.commit()));
	} catch (error) {
		logger.error("お気に入り削除でエラーが発生", {
			audioButtonId,
			error: error instanceof Error ? error.message : String(error),
			stack: error instanceof Error ? error.stack : undefined,
		});
		throw error; // 上位に再スロー
	}
}
