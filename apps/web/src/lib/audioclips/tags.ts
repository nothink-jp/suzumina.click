/**
 * タグ関連のユーティリティ関数
 */
import {
  Timestamp,
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../firebase/client";
import {
  AudioClip,
  type PopularTagsParams,
  type TagApiResponse,
  type TagInfo,
  type TagSearchParams,
} from "./types";

// タグの最大長さ
const MAX_TAG_LENGTH = 30;

// 一度に追加できるタグの最大数
const MAX_TAGS_PER_CLIP = 10;

/**
 * Firestoreのデータベースインスタンスが初期化されているか確認する
 * @returns 初期化されたデータベースインスタンスまたは例外をスロー
 * @throws Firestoreデータベースが初期化されていない場合のエラー
 */
function getFirestore() {
  if (!db) {
    throw new Error("Firestoreデータベースインスタンスが初期化されていません");
  }
  return db;
}

/**
 * タグを正規化する
 * - 両端の空白を削除
 * - 小文字に変換
 * - 特殊文字を削除
 * @param tag タグテキスト
 * @returns 正規化されたタグテキスト
 */
export const normalizeTag = (tag: string): string => {
  return (
    tag
      .trim()
      .toLowerCase()
      // 英数字、日本語、ハイフン、アンダースコアのみ許可
      .replace(
        /[^\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\u3005-\u3006\u30E0-\u9FCF-]/g,
        "",
      )
      // 連続するハイフンやアンダースコアを1つにまとめる
      .replace(/[-_]{2,}/g, (match) => match[0])
  );
};

/**
 * タグをバリデーションする
 * @param tag タグテキスト
 * @returns エラーメッセージ（エラーがなければnull）
 */
export const validateTag = (tag: string): string | null => {
  const normalizedTag = normalizeTag(tag);

  if (!normalizedTag) {
    return "タグを入力してください";
  }

  if (normalizedTag.length > MAX_TAG_LENGTH) {
    return `タグは${MAX_TAG_LENGTH}文字以内で入力してください`;
  }

  return null;
};

/**
 * タグリストをバリデーションする
 * @param tags タグリスト
 * @returns エラーメッセージ（エラーがなければnull）
 */
export const validateTags = (tags: string[]): string | null => {
  if (tags.length > MAX_TAGS_PER_CLIP) {
    return `タグは${MAX_TAGS_PER_CLIP}個までしか設定できません`;
  }

  // 重複をチェック
  const uniqueTags = new Set(tags.map(normalizeTag));
  if (uniqueTags.size !== tags.length) {
    return "重複したタグが含まれています";
  }

  // 個別のタグをチェック
  for (const tag of tags) {
    const error = validateTag(tag);
    if (error) {
      return error;
    }
  }

  return null;
};

/**
 * クリップにタグを追加する
 * @param clipId クリップID
 * @param tags 追加するタグのリスト
 * @returns 成功した場合はtrue、失敗した場合はfalse
 */
export const addTagsToClip = async (
  clipId: string,
  tags: string[],
): Promise<boolean> => {
  try {
    if (!clipId || !tags.length) return false;

    const firestore = getFirestore();

    // タグを正規化
    const normalizedTags = tags.map(normalizeTag).filter(Boolean);

    // バリデーション
    const validationError = validateTags(normalizedTags);
    if (validationError) {
      console.error(`タグの検証エラー: ${validationError}`);
      return false;
    }

    // クリップドキュメントを取得
    const clipRef = doc(firestore, "audioClips", clipId);
    const clipSnap = await getDoc(clipRef);

    if (!clipSnap.exists()) {
      console.error(`クリップが存在しません: ${clipId}`);
      return false;
    }

    // 既存のタグを取得
    const existingTags = clipSnap.data().tags || [];

    // 新しいタグを追加（重複なし）
    const updatedTags = [...new Set([...existingTags, ...normalizedTags])];

    // 最大数を超える場合は制限
    if (updatedTags.length > MAX_TAGS_PER_CLIP) {
      console.error(`タグは${MAX_TAGS_PER_CLIP}個までしか設定できません`);
      return false;
    }

    // クリップのタグを更新
    await updateDoc(clipRef, {
      tags: updatedTags,
      updatedAt: serverTimestamp(),
    });

    // タグ統計を更新（オプショナル：将来的に実装）
    // await updateTagStats(normalizedTags);

    return true;
  } catch (error) {
    console.error("タグ追加エラー:", error);
    return false;
  }
};

/**
 * クリップからタグを削除する
 * @param clipId クリップID
 * @param tags 削除するタグのリスト
 * @returns 成功した場合はtrue、失敗した場合はfalse
 */
export const removeTagsFromClip = async (
  clipId: string,
  tags: string[],
): Promise<boolean> => {
  try {
    if (!clipId || !tags.length) return false;

    const firestore = getFirestore();

    // タグを正規化
    const normalizedTags = tags.map(normalizeTag).filter(Boolean);

    // クリップドキュメントを更新
    const clipRef = doc(firestore, "audioClips", clipId);
    await updateDoc(clipRef, {
      tags: arrayRemove(...normalizedTags),
      updatedAt: serverTimestamp(),
    });

    return true;
  } catch (error) {
    console.error("タグ削除エラー:", error);
    return false;
  }
};

/**
 * クリップのタグを一括更新する
 * @param clipId クリップID
 * @param tags 新しいタグリスト
 * @returns 成功した場合はtrue、失敗した場合はfalse
 */
export const updateClipTags = async (
  clipId: string,
  tags: string[],
): Promise<boolean> => {
  try {
    if (!clipId) return false;

    const firestore = getFirestore();

    // タグを正規化
    const normalizedTags = tags.map(normalizeTag).filter(Boolean);

    // バリデーション
    const validationError = validateTags(normalizedTags);
    if (validationError) {
      console.error(`タグの検証エラー: ${validationError}`);
      return false;
    }

    // クリップドキュメントを更新
    const clipRef = doc(firestore, "audioClips", clipId);
    await updateDoc(clipRef, {
      tags: normalizedTags,
      updatedAt: serverTimestamp(),
    });

    return true;
  } catch (error) {
    console.error("タグ更新エラー:", error);
    return false;
  }
};

/**
 * クエリに基づいてタグを検索する
 * @param params 検索パラメータ
 * @returns タグ検索結果
 */
export const searchTags = async (
  params: TagSearchParams,
): Promise<TagApiResponse> => {
  try {
    const { query: searchQuery, limit: searchLimit = 10 } = params;

    if (!searchQuery) {
      return { tags: [], hasMore: false };
    }

    const firestore = getFirestore();
    const normalizedQuery = normalizeTag(searchQuery);

    // Firestoreではプレフィックス検索のみ可能なため、ここでは簡易的な実装
    // 本番環境では、Algoliaなどの検索サービスの使用を検討するとよい
    const tagsQuery = query(
      collection(firestore, "tags"),
      where("id", ">=", normalizedQuery),
      where("id", "<=", `${normalizedQuery}\uf8ff`),
      orderBy("id"),
      limit(searchLimit + 1), // hasMoreチェック用に1つ多く取得
    );

    const snapshot = await getDocs(tagsQuery);

    // タグ情報を抽出
    const tags: TagInfo[] = [];
    for (const doc of snapshot.docs) {
      if (tags.length < searchLimit) {
        tags.push({
          id: doc.id,
          text: doc.id,
          count: doc.data().count || 0,
        });
      }
    }

    return {
      tags,
      hasMore: snapshot.size > searchLimit,
    };
  } catch (error) {
    console.error("タグ検索エラー:", error);
    return { tags: [], hasMore: false };
  }
};

/**
 * 人気のタグを取得する
 * @param params 取得パラメータ
 * @returns 人気タグ情報
 */
export const getPopularTags = async (
  params: PopularTagsParams = {},
): Promise<TagApiResponse> => {
  try {
    const { limit: tagsLimit = 20, timeRange = "all" } = params;

    const firestore = getFirestore();

    // timeRangeに基づいて期間を限定することも可能
    // 現在は全期間の人気タグを取得

    const tagsQuery = query(
      collection(firestore, "tags"),
      orderBy("count", "desc"),
      limit(tagsLimit + 1), // hasMoreチェック用に1つ多く取得
    );

    const snapshot = await getDocs(tagsQuery);

    // タグ情報を抽出
    const tags: TagInfo[] = [];
    for (const doc of snapshot.docs) {
      if (tags.length < tagsLimit) {
        tags.push({
          id: doc.id,
          text: doc.id,
          count: doc.data().count || 0,
        });
      }
    }

    return {
      tags,
      hasMore: snapshot.size > tagsLimit,
    };
  } catch (error) {
    console.error("人気タグ取得エラー:", error);
    return { tags: [], hasMore: false };
  }
};

/**
 * 指定されたクリップのタグを取得する
 * @param clipId クリップID
 * @returns タグ情報のリスト
 */
export const getClipTags = async (clipId: string): Promise<TagInfo[]> => {
  try {
    if (!clipId) return [];

    const firestore = getFirestore();
    const clipRef = doc(firestore, "audioClips", clipId);
    const clipSnap = await getDoc(clipRef);

    if (!clipSnap.exists()) {
      return [];
    }

    const tags = clipSnap.data().tags || [];

    // タグ情報に変換
    return tags.map((tag: string) => ({
      id: tag,
      text: tag,
      count: 0, // タグカウント情報がない場合は0をデフォルト値として設定
    }));
  } catch (error) {
    console.error("クリップタグ取得エラー:", error);
    return [];
  }
};
