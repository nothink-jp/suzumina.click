"use server";

import {
	type AudioButtonCategory,
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
import { requireAuth } from "@/components/ProtectedRoute";
import { FirestoreAdmin } from "@/lib/firestore-admin";
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
		logger.debug("認証チェック完了", { userId: user.discordId });

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
		logger.debug("入力データのバリデーション成功", { validatedInput });

		// レート制限のためのユーザーベースチェック
		logger.debug("レート制限チェック開始", { userId: user.discordId });
		const firestore = FirestoreAdmin.getInstance();
		const recentCreationsSnapshot = await firestore
			.collection("audioButtons")
			.where("uploadedBy", "==", user.discordId)
			.where("createdAt", ">", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
			.get();

		const recentCreations = recentCreationsSnapshot.docs.map((doc) => ({
			id: doc.id,
			...doc.data(),
		})) as FirestoreAudioButtonData[];

		logger.debug("最近の作成済み音声ボタン取得完了", {
			recentCreationsCount: recentCreations.length,
		});

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

		logger.debug("YouTube動画情報取得開始", { videoId: validatedInput.sourceVideoId });
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
		logger.debug("YouTube動画情報取得成功", {
			videoId: validatedInput.sourceVideoId,
			title: videoInfo.title,
			duration: videoInfo.duration,
		});

		// 同じ動画の他の音声ボタンを取得して重複チェック
		logger.debug("既存音声ボタンの重複チェック開始", {
			videoId: validatedInput.sourceVideoId,
		});
		const existingAudioButtonsQuery = await firestore
			.collection("audioButtons")
			.where("sourceVideoId", "==", validatedInput.sourceVideoId)
			.get();

		const existingButtons = existingAudioButtonsQuery.docs.map((doc) => ({
			id: doc.id,
			...doc.data(),
		})) as FirestoreAudioButtonData[];

		logger.debug("既存音声ボタン取得完了", {
			existingButtonsCount: existingButtons.length,
		});

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

		logger.debug("バリデーション成功、Firestoreに保存開始");

		// Firestoreデータの作成（ユーザー情報付き）
		const firestoreData = convertCreateInputToFirestoreAudioButton(
			validatedInput,
			user.discordId,
			user.displayName,
		);

		logger.debug("Firestoreデータ作成完了", {
			title: firestoreData.title,
			category: firestoreData.category,
		});

		const docRef = await firestore.collection("audioButtons").add(firestoreData);

		// ドキュメント作成後にIDフィールドを設定
		await docRef.update({ id: docRef.id });

		logger.debug("Firestore保存完了", { documentId: docRef.id });

		logger.debug("統計情報更新開始");
		await updateVideoAudioButtonStats(validatedInput.sourceVideoId, {
			increment: true,
		});
		await updateUserStats(user.discordId, {
			incrementAudioButtons: true,
		});
		logger.debug("統計情報更新完了");

		logger.debug("キャッシュ無効化開始");
		revalidatePath("/buttons");
		revalidatePath(`/videos/${validatedInput.sourceVideoId}`);
		logger.debug("キャッシュ無効化完了");

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
		const firestore = FirestoreAdmin.getInstance();

		// Firestoreクエリの構築
		let firestoreQuery = firestore.collection("audioButtons").where("isPublic", "==", true);

		// カテゴリフィルター
		if (validatedQuery.category) {
			firestoreQuery = firestoreQuery.where("category", "==", validatedQuery.category);
		}

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

		// ページネーション
		if (validatedQuery.startAfter) {
			const startAfterDoc = await firestore
				.collection("audioButtons")
				.doc(validatedQuery.startAfter)
				.get();
			if (startAfterDoc.exists) {
				firestoreQuery = firestoreQuery.startAfter(startAfterDoc);
			}
		}

		// 制限数 + 1 (hasMoreの判定用)
		firestoreQuery = firestoreQuery.limit(validatedQuery.limit + 1);

		// データ取得
		const snapshot = await firestoreQuery.get();
		const docs = snapshot.docs;

		// hasMoreの判定
		const hasMore = docs.length > validatedQuery.limit;
		const audioButtonDocs = hasMore ? docs.slice(0, -1) : docs;

		// Firestore データをフロントエンド用に変換
		let audioButtons = audioButtonDocs.map((doc) => {
			const data = { id: doc.id, ...doc.data() } as FirestoreAudioButtonData;
			return convertToFrontendAudioButton(data);
		});

		// クライアントサイドフィルタリング（Firestoreでは対応できない条件）
		audioButtons = filterAudioButtons(audioButtons, {
			searchText: validatedQuery.searchText,
			tags: validatedQuery.tags,
		});

		// クライアントサイド並び替え（複合条件の場合）
		if (validatedQuery.sortBy === "popular") {
			audioButtons = sortAudioButtons(audioButtons, "popular");
		}

		const result: AudioButtonListResult = {
			audioButtons,
			hasMore,
			lastAudioButton: audioButtons.length > 0 ? audioButtons[audioButtons.length - 1] : undefined,
			totalCount: undefined, // 高コストなため省略
		};

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
 * カテゴリ別の音声ボタンを取得するServer Action
 */
export async function getAudioButtonsByCategory(
	category: string,
	limit = 6,
): Promise<FrontendAudioButtonData[]> {
	try {
		const result = await getAudioButtons({
			limit,
			category: category as AudioButtonCategory,
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
 * 音声ボタンの統計を更新するServer Action
 */
export async function updateAudioButtonStats(
	statsUpdate: Partial<UpdateAudioButtonStats> & { id: string },
): Promise<{ success: boolean; error?: string }> {
	try {
		// 認証チェック（統計更新は認証ユーザーのみ）
		await requireAuth();
		// バリデーション
		const validationResult = UpdateAudioButtonStatsSchema.safeParse(statsUpdate);
		if (!validationResult.success) {
			return {
				success: false,
				error: `統計更新データが無効です: ${validationResult.error.errors.map((e) => e.message).join(", ")}`,
			};
		}

		const validatedUpdate = validationResult.data;
		const firestore = FirestoreAdmin.getInstance();

		// 更新データの作成
		const updateData: Record<string, unknown> = {
			updatedAt: new Date().toISOString(),
		};

		if (validatedUpdate.incrementPlayCount) {
			updateData.playCount = firestore.FieldValue.increment(1);
		}

		if (validatedUpdate.incrementLikeCount) {
			updateData.likeCount = firestore.FieldValue.increment(1);
		}

		if (validatedUpdate.decrementLikeCount) {
			updateData.likeCount = firestore.FieldValue.increment(-1);
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
				if (audioButtonData.uploadedBy) {
					await updateUserStats(audioButtonData.uploadedBy, {
						incrementPlayCount: 1,
					});
				}
			}
		}

		// キャッシュの無効化
		revalidatePath("/buttons");
		revalidatePath(`/buttons/${validatedUpdate.id}`);

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

		const firestore = FirestoreAdmin.getInstance();
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
	} catch (_error) {
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
		const firestore = FirestoreAdmin.getInstance();

		// 既存の動画ドキュメントを取得
		const videoDoc = await firestore.collection("videos").doc(videoId).get();

		if (videoDoc.exists) {
			const updateData: {
				updatedAt: string;
				audioButtonCount?: ReturnType<typeof firestore.FieldValue.increment>;
			} = {
				updatedAt: new Date().toISOString(),
			};

			if (options.increment) {
				updateData.audioButtonCount = firestore.FieldValue.increment(1);
			}

			if (options.decrement) {
				updateData.audioButtonCount = firestore.FieldValue.increment(-1);
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
