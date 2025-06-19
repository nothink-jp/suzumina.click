"use server";

import { FirestoreAdmin } from "@/lib/firestore-admin";
import {
  type AudioReferenceCategory,
  type AudioReferenceListResult,
  type AudioReferenceQuery,
  AudioReferenceQuerySchema,
  type CreateAudioReferenceInput,
  CreateAudioReferenceInputSchema,
  type FirestoreAudioReferenceData,
  type FrontendAudioReferenceData,
  type UpdateAudioReferenceStats,
  UpdateAudioReferenceStatsSchema,
  type YouTubeVideoInfo,
  checkRateLimit,
  convertCreateInputToFirestoreAudioReference,
  convertToFrontendAudioReference,
  filterAudioReferences,
  sortAudioReferences,
  validateAudioReferenceCreation,
} from "@suzumina.click/shared-types";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

/**
 * 音声リファレンスを作成するServer Action
 */
export async function createAudioReference(
  input: CreateAudioReferenceInput,
): Promise<
  { success: true; data: { id: string } } | { success: false; error: string }
> {
  try {
    // 入力データのバリデーション
    const validationResult = CreateAudioReferenceInputSchema.safeParse(input);
    if (!validationResult.success) {
      return {
        success: false,
        error: `入力データが無効です: ${validationResult.error.errors.map((e) => e.message).join(", ")}`,
      };
    }

    const validatedInput = validationResult.data;

    // クライアントIPアドレスの取得（レート制限用）
    const headersList = await headers();
    const clientIp =
      headersList.get("x-forwarded-for") || headersList.get("x-real-ip");

    // YouTube動画情報の取得
    const videoInfo = await fetchYouTubeVideoInfo(validatedInput.videoId);
    if (!videoInfo) {
      return {
        success: false,
        error: "指定されたYouTube動画が見つからないか、アクセスできません",
      };
    }

    // バリデーション
    const validation = validateAudioReferenceCreation(
      validatedInput,
      videoInfo,
    );
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.errors.join(", "),
      };
    }

    // レート制限チェック
    if (clientIp) {
      const firestore = FirestoreAdmin.getInstance();
      const recentCreationsSnapshot = await firestore
        .collection("audioReferences")
        .where(
          "createdAt",
          ">",
          new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        )
        .get();

      const recentCreations = recentCreationsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as FirestoreAudioReferenceData[];

      const rateLimitCheck = checkRateLimit(recentCreations, clientIp);
      if (!rateLimitCheck.allowed) {
        return {
          success: false,
          error: `投稿制限に達しています。1日に作成できる音声ボタンは20個までです。リセット時間: ${rateLimitCheck.resetTime.toLocaleString()}`,
        };
      }
    }

    // Firestoreデータの作成
    const firestoreData = convertCreateInputToFirestoreAudioReference(
      validatedInput,
      videoInfo,
      clientIp || undefined,
    );

    // Firestoreに保存
    const firestore = FirestoreAdmin.getInstance();
    const docRef = await firestore
      .collection("audioReferences")
      .add(firestoreData);

    // 元動画の統計を更新（音声ボタン数を増加）
    await updateVideoAudioButtonStats(validatedInput.videoId, {
      increment: true,
    });

    // キャッシュの無効化
    revalidatePath("/buttons");
    revalidatePath(`/videos/${validatedInput.videoId}`);

    return {
      success: true,
      data: { id: docRef.id },
    };
  } catch (error) {
    console.error("音声リファレンス作成エラー:", error);
    return {
      success: false,
      error:
        "音声ボタンの作成に失敗しました。しばらく時間をおいてから再度お試しください。",
    };
  }
}

/**
 * 音声リファレンスを検索・取得するServer Action
 */
export async function getAudioReferences(
  query: AudioReferenceQuery = {},
): Promise<
  | { success: true; data: AudioReferenceListResult }
  | { success: false; error: string }
> {
  try {
    // クエリのバリデーション
    const validationResult = AudioReferenceQuerySchema.safeParse(query);
    if (!validationResult.success) {
      return {
        success: false,
        error: `検索条件が無効です: ${validationResult.error.errors.map((e) => e.message).join(", ")}`,
      };
    }

    const validatedQuery = validationResult.data;
    const firestore = FirestoreAdmin.getInstance();

    // Firestoreクエリの構築
    let firestoreQuery = firestore
      .collection("audioReferences")
      .where("isPublic", "==", true);

    // カテゴリフィルター
    if (validatedQuery.category) {
      firestoreQuery = firestoreQuery.where(
        "category",
        "==",
        validatedQuery.category,
      );
    }

    // 動画IDフィルター
    if (validatedQuery.videoId) {
      firestoreQuery = firestoreQuery.where(
        "videoId",
        "==",
        validatedQuery.videoId,
      );
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
      case "mostPlayed":
        firestoreQuery = firestoreQuery.orderBy("playCount", "desc");
        break;
      case "mostLiked":
        firestoreQuery = firestoreQuery.orderBy("likeCount", "desc");
        break;
      default:
        firestoreQuery = firestoreQuery.orderBy("createdAt", "desc");
    }

    // ページネーション
    if (validatedQuery.startAfter) {
      const startAfterDoc = await firestore
        .collection("audioReferences")
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
    const audioReferenceDocs = hasMore ? docs.slice(0, -1) : docs;

    // Firestore データをフロントエンド用に変換
    let audioReferences = audioReferenceDocs.map((doc) => {
      const data = { id: doc.id, ...doc.data() } as FirestoreAudioReferenceData;
      return convertToFrontendAudioReference(data);
    });

    // クライアントサイドフィルタリング（Firestoreでは対応できない条件）
    audioReferences = filterAudioReferences(audioReferences, {
      searchText: validatedQuery.searchText,
      tags: validatedQuery.tags,
    });

    // クライアントサイド並び替え（複合条件の場合）
    if (validatedQuery.sortBy === "popular") {
      audioReferences = sortAudioReferences(audioReferences, "popular");
    }

    const result: AudioReferenceListResult = {
      audioReferences,
      hasMore,
      lastAudioReference:
        audioReferences.length > 0
          ? audioReferences[audioReferences.length - 1]
          : undefined,
      totalCount: undefined, // 高コストなため省略
    };

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    console.error("音声リファレンス取得エラー:", error);
    return {
      success: false,
      error: "音声ボタンの取得に失敗しました。",
    };
  }
}

/**
 * 人気の音声リファレンスを取得するServer Action
 */
export async function getPopularAudioReferences(
  limit = 6,
): Promise<FrontendAudioReferenceData[]> {
  try {
    const result = await getAudioReferences({
      limit,
      sortBy: "popular",
      onlyPublic: true,
    });

    if (result.success) {
      return result.data.audioReferences;
    }

    return [];
  } catch (error) {
    console.error("人気音声リファレンス取得エラー:", error);
    return [];
  }
}

/**
 * 最新の音声リファレンスを取得するServer Action
 */
export async function getRecentAudioReferences(
  limit = 6,
): Promise<FrontendAudioReferenceData[]> {
  try {
    const result = await getAudioReferences({
      limit,
      sortBy: "newest",
      onlyPublic: true,
    });

    if (result.success) {
      return result.data.audioReferences;
    }

    return [];
  } catch (error) {
    console.error("最新音声リファレンス取得エラー:", error);
    return [];
  }
}

/**
 * カテゴリ別の音声リファレンスを取得するServer Action
 */
export async function getAudioReferencesByCategory(
  category: string,
  limit = 6,
): Promise<FrontendAudioReferenceData[]> {
  try {
    const result = await getAudioReferences({
      limit,
      category: category as AudioReferenceCategory,
      sortBy: "newest",
      onlyPublic: true,
    });

    if (result.success) {
      return result.data.audioReferences;
    }

    return [];
  } catch (error) {
    console.error("カテゴリ別音声リファレンス取得エラー:", error);
    return [];
  }
}

/**
 * 音声リファレンスの統計を更新するServer Action
 */
export async function updateAudioReferenceStats(
  statsUpdate: UpdateAudioReferenceStats,
): Promise<{ success: boolean; error?: string }> {
  try {
    // バリデーション
    const validationResult =
      UpdateAudioReferenceStatsSchema.safeParse(statsUpdate);
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

    if (validatedUpdate.incrementViewCount) {
      updateData.viewCount = firestore.FieldValue.increment(1);
    }

    if (validatedUpdate.decrementLikeCount) {
      updateData.likeCount = firestore.FieldValue.increment(-1);
    }

    // Firestoreを更新
    await firestore
      .collection("audioReferences")
      .doc(validatedUpdate.id)
      .update(updateData);

    // キャッシュの無効化
    revalidatePath("/buttons");
    revalidatePath(`/buttons/${validatedUpdate.id}`);

    return { success: true };
  } catch (error) {
    console.error("音声リファレンス統計更新エラー:", error);
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
  return updateAudioReferenceStats({
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
  return updateAudioReferenceStats({
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
  return updateAudioReferenceStats({
    id,
    decrementLikeCount: true,
  });
}

/**
 * 表示回数を増加させるServer Action
 */
export async function incrementViewCount(
  id: string,
): Promise<{ success: boolean; error?: string }> {
  return updateAudioReferenceStats({
    id,
    incrementViewCount: true,
  });
}

/**
 * YouTube動画情報を取得するヘルパー関数
 */
async function fetchYouTubeVideoInfo(
  videoId: string,
): Promise<YouTubeVideoInfo | null> {
  try {
    // YouTube Data API v3を使用して動画情報を取得
    // 実装は既存のYouTube関数と統合
    const API_KEY = process.env.YOUTUBE_API_KEY;
    if (!API_KEY) {
      console.error("YouTube API keyが設定されていません");
      return null;
    }

    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=snippet,contentDetails&key=${API_KEY}`,
    );

    if (!response.ok) {
      console.error("YouTube API呼び出しエラー:", response.status);
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
    const duration = contentDetails?.duration
      ? parseDuration(contentDetails.duration)
      : undefined;

    return {
      videoId,
      title: snippet.title,
      channelId: snippet.channelId,
      channelTitle: snippet.channelTitle,
      thumbnailUrl:
        snippet.thumbnails?.maxresdefault?.url || snippet.thumbnails?.high?.url,
      duration: duration ? Math.floor(duration / 1000) : undefined,
      publishedAt: snippet.publishedAt,
    };
  } catch (error) {
    console.error("YouTube動画情報取得エラー:", error);
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
  } catch (error) {
    console.error("動画音声ボタン統計更新エラー:", error);
    // 非クリティカルなエラーなので続行
  }
}

/**
 * ISO 8601期間文字列を秒数に変換するヘルパー関数
 */
function parseDuration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;

  const hours = Number.parseInt(match[1] || "0", 10);
  const minutes = Number.parseInt(match[2] || "0", 10);
  const seconds = Number.parseInt(match[3] || "0", 10);

  return (hours * 3600 + minutes * 60 + seconds) * 1000; // ミリ秒で返す
}

/**
 * IDによる音声リファレンス取得
 */
export async function getAudioReferenceById(id: string): Promise<
  | {
      success: true;
      data: FrontendAudioReferenceData;
    }
  | {
      success: false;
      error: string;
    }
> {
  try {
    if (!id || typeof id !== "string") {
      return {
        success: false,
        error: "有効なIDを指定してください。",
      };
    }

    const firestore = FirestoreAdmin.getInstance();
    const doc = await firestore
      .collection("audioReferences")
      .doc(id.trim())
      .get();

    if (!doc.exists) {
      return {
        success: false,
        error: "音声ボタンが見つかりませんでした。",
      };
    }

    // Firestore データをフロントエンド用に変換
    const data = { id: doc.id, ...doc.data() } as FirestoreAudioReferenceData;
    const audioReference = convertToFrontendAudioReference(data);

    // 公開設定のチェック
    if (!audioReference.isPublic) {
      return {
        success: false,
        error: "この音声ボタンは非公開です。",
      };
    }

    return {
      success: true,
      data: audioReference,
    };
  } catch (error) {
    console.error("音声リファレンス取得エラー:", error);
    return {
      success: false,
      error: "音声ボタンの取得に失敗しました。",
    };
  }
}
