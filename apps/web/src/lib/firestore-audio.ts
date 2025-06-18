import { Timestamp } from "@google-cloud/firestore";
import {
  type AudioButtonCategory,
  AudioButtonCategorySchema,
  type AudioButtonListResult,
  type AudioButtonQuery,
  type FirestoreAudioButtonData,
  type FrontendAudioButtonData,
  convertToFrontendAudioButton,
} from "@suzumina.click/shared-types";
import { getFirestore } from "./firestore";

/**
 * Firestoreタイムスタンプを ISO 文字列に変換
 */
function timestampToISOString(timestamp: unknown): string {
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate().toISOString();
  }
  if (timestamp instanceof Date) {
    return timestamp.toISOString();
  }
  if (typeof timestamp === "string") {
    return timestamp;
  }
  return new Date().toISOString();
}

/**
 * Firestore文書データを FrontendAudioButtonData に変換
 */
function convertFirestoreDoc(
  doc: FirebaseFirestore.DocumentSnapshot,
): FrontendAudioButtonData | null {
  if (!doc.exists) return null;

  try {
    const data = doc.data();
    if (!data) return null;

    const firestoreData: FirestoreAudioButtonData = {
      id: doc.id,
      title: data.title,
      description: data.description || "",
      category: data.category,
      tags: data.tags || [],
      audioUrl: data.audioUrl,
      duration: data.duration,
      fileSize: data.fileSize,
      format: data.format,
      sourceVideoId: data.sourceVideoId,
      sourceVideoTitle: data.sourceVideoTitle,
      startTime: data.startTime,
      endTime: data.endTime,
      uploadedBy: data.uploadedBy,
      isPublic: data.isPublic ?? true,
      playCount: data.playCount || 0,
      likeCount: data.likeCount || 0,
      createdAt: timestampToISOString(data.createdAt),
      updatedAt: timestampToISOString(data.updatedAt),
    };

    return convertToFrontendAudioButton(firestoreData);
  } catch (error) {
    console.error("音声ボタンデータ変換エラー:", error);
    return null;
  }
}

/**
 * 音声ボタンを ID で取得
 */
export async function getAudioButtonById(
  id: string,
): Promise<FrontendAudioButtonData | null> {
  try {
    const firestore = getFirestore();
    const docRef = firestore.collection("audioButtons").doc(id);
    const docSnap = await docRef.get();
    return convertFirestoreDoc(docSnap);
  } catch (error) {
    console.error("音声ボタン取得エラー:", error);
    return null;
  }
}

/**
 * 音声ボタン一覧を検索条件付きで取得
 */
export async function getAudioButtons(
  queryParams: AudioButtonQuery,
): Promise<AudioButtonListResult> {
  try {
    const {
      limit: limitCount = 20,
      startAfter: startAfterId,
      category,
      tags,
      sourceVideoId,
      searchText,
      sortBy = "newest",
      onlyPublic = true,
    } = queryParams;

    const firestore = getFirestore();
    let query = firestore.collection("audioButtons");

    // 公開フィルター
    if (onlyPublic) {
      query = query.where("isPublic", "==", true);
    }

    // カテゴリフィルター
    if (category) {
      query = query.where("category", "==", category);
    }

    // 元動画フィルター
    if (sourceVideoId) {
      query = query.where("sourceVideoId", "==", sourceVideoId);
    }

    // タグフィルター（配列の要素を含む検索）
    if (tags && tags.length > 0) {
      query = query.where("tags", "array-contains-any", tags);
    }

    // ソート条件
    switch (sortBy) {
      case "oldest":
        query = query.orderBy("createdAt", "asc");
        break;
      case "popular":
        query = query.orderBy("likeCount", "desc");
        break;
      case "mostPlayed":
        query = query.orderBy("playCount", "desc");
        break;
      default:
        query = query.orderBy("createdAt", "desc");
        break;
    }

    // startAfter の処理
    if (startAfterId) {
      try {
        const startAfterDoc = await firestore
          .collection("audioButtons")
          .doc(startAfterId)
          .get();
        if (startAfterDoc.exists) {
          query = query.startAfter(startAfterDoc);
        }
      } catch (error) {
        console.warn("startAfter文書取得エラー:", error);
      }
    }

    // 制限設定（+1 で hasMore を判定）
    query = query.limit(limitCount + 1);

    // クエリ実行
    const snapshot = await query.get();

    // 結果処理
    const docs = snapshot.docs;
    const hasMore = docs.length > limitCount;
    const audioButtonDocs = hasMore ? docs.slice(0, limitCount) : docs;

    const audioButtons = audioButtonDocs
      .map(convertFirestoreDoc)
      .filter(
        (
          button: FrontendAudioButtonData | null,
        ): button is FrontendAudioButtonData => button !== null,
      );

    // テキスト検索（クライアントサイドフィルタリング）
    let filteredButtons = audioButtons;
    if (searchText?.trim()) {
      const searchLower = searchText.toLowerCase().trim();
      filteredButtons = audioButtons.filter(
        (button: FrontendAudioButtonData) =>
          button.title.toLowerCase().includes(searchLower) ||
          button.description?.toLowerCase().includes(searchLower) ||
          button.tags?.some((tag) => tag.toLowerCase().includes(searchLower)) ||
          button.sourceVideoTitle?.toLowerCase().includes(searchLower),
      );
    }

    // 最後のアイテム
    const lastAudioButton =
      filteredButtons.length > 0
        ? filteredButtons[filteredButtons.length - 1]
        : undefined;

    return {
      audioButtons: filteredButtons,
      hasMore,
      lastAudioButton,
      totalCount: undefined, // 正確な総数は別途必要に応じて実装
    };
  } catch (error) {
    console.error("音声ボタン一覧取得エラー:", error);
    return {
      audioButtons: [],
      hasMore: false,
    };
  }
}

/**
 * 特定動画の音声ボタン一覧を取得
 */
export async function getAudioButtonsByVideoId(
  videoId: string,
  limitCount = 20,
): Promise<FrontendAudioButtonData[]> {
  try {
    const firestore = getFirestore();
    const snapshot = await firestore
      .collection("audioButtons")
      .where("sourceVideoId", "==", videoId)
      .where("isPublic", "==", true)
      .orderBy("startTime", "asc")
      .limit(limitCount)
      .get();

    return snapshot.docs
      .map(convertFirestoreDoc)
      .filter((button): button is FrontendAudioButtonData => button !== null);
  } catch (error) {
    console.error("動画別音声ボタン取得エラー:", error);
    return [];
  }
}

/**
 * 人気の音声ボタンを取得
 */
export async function getPopularAudioButtons(
  limitCount = 10,
): Promise<FrontendAudioButtonData[]> {
  try {
    const firestore = getFirestore();
    const snapshot = await firestore
      .collection("audioButtons")
      .where("isPublic", "==", true)
      .orderBy("playCount", "desc")
      .limit(limitCount)
      .get();

    return snapshot.docs
      .map(convertFirestoreDoc)
      .filter((button): button is FrontendAudioButtonData => button !== null);
  } catch (error) {
    console.error("人気音声ボタン取得エラー:", error);
    return [];
  }
}

/**
 * 最新の音声ボタンを取得
 */
export async function getRecentAudioButtons(
  limitCount = 10,
): Promise<FrontendAudioButtonData[]> {
  try {
    const firestore = getFirestore();
    const snapshot = await firestore
      .collection("audioButtons")
      .where("isPublic", "==", true)
      .orderBy("createdAt", "desc")
      .limit(limitCount)
      .get();

    return snapshot.docs
      .map(convertFirestoreDoc)
      .filter((button): button is FrontendAudioButtonData => button !== null);
  } catch (error) {
    console.error("最新音声ボタン取得エラー:", error);
    return [];
  }
}

/**
 * タグ別音声ボタンを取得
 */
export async function getAudioButtonsByTag(
  tag: string,
  limitCount = 20,
): Promise<FrontendAudioButtonData[]> {
  try {
    const firestore = getFirestore();
    const snapshot = await firestore
      .collection("audioButtons")
      .where("tags", "array-contains", tag)
      .where("isPublic", "==", true)
      .orderBy("createdAt", "desc")
      .limit(limitCount)
      .get();

    return snapshot.docs
      .map(convertFirestoreDoc)
      .filter((button): button is FrontendAudioButtonData => button !== null);
  } catch (error) {
    console.error("タグ別音声ボタン取得エラー:", error);
    return [];
  }
}

/**
 * カテゴリ別音声ボタンを取得
 */
export async function getAudioButtonsByCategory(
  category: AudioButtonCategory,
  limitCount = 20,
): Promise<FrontendAudioButtonData[]> {
  try {
    const firestore = getFirestore();
    const snapshot = await firestore
      .collection("audioButtons")
      .where("category", "==", category)
      .where("isPublic", "==", true)
      .orderBy("createdAt", "desc")
      .limit(limitCount)
      .get();

    return snapshot.docs
      .map(convertFirestoreDoc)
      .filter((button): button is FrontendAudioButtonData => button !== null);
  } catch (error) {
    console.error("カテゴリ別音声ボタン取得エラー:", error);
    return [];
  }
}

/**
 * 音声ボタンの統計情報を取得
 */
export async function getAudioButtonStats(): Promise<{
  totalCount: number;
  categoryCounts: Record<AudioButtonCategory, number>;
  totalPlayCount: number;
  totalLikeCount: number;
}> {
  try {
    const firestore = getFirestore();
    // 公開音声ボタンの全件取得（統計用）
    const snapshot = await firestore
      .collection("audioButtons")
      .where("isPublic", "==", true)
      .get();

    const audioButtons = snapshot.docs.map((doc) => doc.data());

    // 統計計算
    const totalCount = audioButtons.length;
    const categoryCounts: Record<AudioButtonCategory, number> = {
      voice: 0,
      bgm: 0,
      se: 0,
      talk: 0,
      singing: 0,
      other: 0,
    };

    let totalPlayCount = 0;
    let totalLikeCount = 0;

    for (const button of audioButtons) {
      // カテゴリ別カウント
      const category = button.category as AudioButtonCategory;
      if (AudioButtonCategorySchema.safeParse(category).success) {
        categoryCounts[category]++;
      }

      // 総再生回数・いいね数
      totalPlayCount += button.playCount || 0;
      totalLikeCount += button.likeCount || 0;
    }

    return {
      totalCount,
      categoryCounts,
      totalPlayCount,
      totalLikeCount,
    };
  } catch (error) {
    console.error("音声ボタン統計取得エラー:", error);
    return {
      totalCount: 0,
      categoryCounts: {
        voice: 0,
        bgm: 0,
        se: 0,
        talk: 0,
        singing: 0,
        other: 0,
      },
      totalPlayCount: 0,
      totalLikeCount: 0,
    };
  }
}

/**
 * 音声ボタン検索（全文検索）
 */
export async function searchAudioButtons(
  searchText: string,
  options: Partial<AudioButtonQuery> = {},
): Promise<AudioButtonListResult> {
  // Firestoreの制限により、完全な全文検索はサーバーサイドでは困難
  // ここではタイトルの部分一致と、クライアントサイドフィルタリングを組み合わせる

  try {
    // まず大量のデータを取得してクライアントサイドでフィルタリング
    const allButtons = await getAudioButtons({
      sortBy: "newest",
      onlyPublic: true,
      ...options,
      searchText: undefined, // サーバーサイド検索は一旦無効化
      limit: 100, // 検索用に多めに取得
    });

    // クライアントサイドで検索フィルタリング
    const searchLower = searchText.toLowerCase().trim();
    const filteredButtons = allButtons.audioButtons.filter(
      (button) =>
        button.title.toLowerCase().includes(searchLower) ||
        button.description?.toLowerCase().includes(searchLower) ||
        button.tags?.some((tag) => tag.toLowerCase().includes(searchLower)) ||
        button.sourceVideoTitle?.toLowerCase().includes(searchLower),
    );

    // ページネーション適用
    const limit = options.limit || 20;
    const hasMore = filteredButtons.length > limit;
    const resultButtons = hasMore
      ? filteredButtons.slice(0, limit)
      : filteredButtons;

    return {
      audioButtons: resultButtons,
      hasMore,
      lastAudioButton:
        resultButtons.length > 0
          ? resultButtons[resultButtons.length - 1]
          : undefined,
      totalCount: filteredButtons.length,
    };
  } catch (error) {
    console.error("音声ボタン検索エラー:", error);
    return {
      audioButtons: [],
      hasMore: false,
    };
  }
}
