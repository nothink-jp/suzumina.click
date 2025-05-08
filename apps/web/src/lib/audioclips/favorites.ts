/**
 * 音声クリップのお気に入り機能に関するユーティリティ関数
 */
import {
  type FieldValue,
  type Firestore,
  collection,
  deleteDoc,
  doc,
  limit as firestoreLimit,
  getDoc,
  getDocs,
  getFirestore,
  increment,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { app } from "../firebase/client"; // アプリインスタンスをインポート
import { getFavoriteClips as apiFetchFavoriteClips } from "./api";
import type { AudioClip, AudioClipFavorite } from "./types";

/**
 * Firestoreインスタンスを取得
 * クライアントサイドでのみ実行されることに注意
 */
const getFirestoreInstance = (): Firestore | null => {
  // ブラウザでのみFirestoreを初期化
  if (typeof window === "undefined") {
    return null;
  }

  try {
    if (!app) {
      throw new Error("Firebaseアプリが初期化されていません");
    }
    return getFirestore(app);
  } catch (error) {
    console.error("Firestoreの初期化に失敗しました:", error);
    return null;
  }
};

/**
 * お気に入りコレクションへの参照を取得
 * @param userId ユーザーID
 * @returns コレクション参照
 */
const getFavoritesCollection = (userId: string) => {
  const db = getFirestoreInstance();
  if (!db) {
    throw new Error("Firestoreデータベースインスタンスが初期化されていません");
  }
  return collection(db, `users/${userId}/favorites`);
};

/**
 * お気に入り登録状態をチェックする
 * @param userId ユーザーID
 * @param clipId クリップID
 * @returns お気に入り登録されているかどうか
 */
export const checkFavoriteStatus = async (
  userId: string,
  clipId: string,
): Promise<boolean> => {
  if (!userId) return false;

  const db = getFirestoreInstance();
  if (!db) {
    throw new Error("Firestoreデータベースインスタンスが初期化されていません");
  }
  const favoriteRef = doc(db, `users/${userId}/favorites/${clipId}`);
  const favoriteSnap = await getDoc(favoriteRef);

  return favoriteSnap.exists();
};

/**
 * お気に入りに追加する
 * @param userId ユーザーID
 * @param clip 音声クリップ
 * @returns 成功した場合はtrue、失敗した場合はfalse
 */
export const addToFavorites = async (
  userId: string,
  clip: AudioClip,
): Promise<boolean> => {
  try {
    if (!userId) return false;

    const db = getFirestoreInstance();
    if (!db) {
      throw new Error(
        "Firestoreデータベースインスタンスが初期化されていません",
      );
    }

    // Firestoreに保存する際の型定義（FieldValueを使用）
    type FirestoreAudioClipFavorite = Omit<AudioClipFavorite, "createdAt"> & {
      createdAt: FieldValue;
    };

    const favoriteData: FirestoreAudioClipFavorite = {
      userId,
      clipId: clip.id,
      createdAt: serverTimestamp(),
    };

    // ドキュメントIDにclipIdを使用してお気に入り追加
    const favoriteRef = doc(db, `users/${userId}/favorites/${clip.id}`);
    await setDoc(favoriteRef, favoriteData);

    // クリップのお気に入り数をインクリメント
    await incrementFavoriteCount(clip.id);

    return true;
  } catch (error) {
    console.error("お気に入り追加エラー:", error);
    return false;
  }
};

/**
 * お気に入りから削除する
 * @param userId ユーザーID
 * @param clipId クリップID
 * @returns 成功した場合はtrue、失敗した場合はfalse
 */
export const removeFromFavorites = async (
  userId: string,
  clipId: string,
): Promise<boolean> => {
  try {
    if (!userId) return false;

    const db = getFirestoreInstance();
    if (!db) {
      throw new Error(
        "Firestoreデータベースインスタンスが初期化されていません",
      );
    }

    const favoriteRef = doc(db, `users/${userId}/favorites/${clipId}`);
    await deleteDoc(favoriteRef);

    // クリップのお気に入り数をデクリメント
    await decrementFavoriteCount(clipId);

    return true;
  } catch (error) {
    console.error("お気に入り削除エラー:", error);
    return false;
  }
};

/**
 * お気に入りをトグルする（追加または削除）
 * @param userId ユーザーID
 * @param clip 音声クリップ
 * @returns トグル後のお気に入り状態
 */
export const toggleFavorite = async (
  userId: string,
  clip: AudioClip,
): Promise<boolean> => {
  if (!userId) return false;

  const isFavorite = await checkFavoriteStatus(userId, clip.id);

  if (isFavorite) {
    await removeFromFavorites(userId, clip.id);
    return false;
  }

  await addToFavorites(userId, clip);
  return true;
};

/**
 * ユーザーのお気に入りリストを取得
 * @param userId ユーザーID
 * @param limit 取得件数の制限
 * @returns お気に入りクリップのIDリスト
 */
export const getUserFavorites = async (
  userId: string,
  limit = 100,
): Promise<string[]> => {
  if (!userId) return [];

  try {
    const db = getFirestoreInstance();
    if (!db) {
      throw new Error(
        "Firestoreデータベースインスタンスが初期化されていません",
      );
    }

    const favoritesQuery = query(
      getFavoritesCollection(userId),
      where("userId", "==", userId),
      orderBy("createdAt", "desc"),
      firestoreLimit(limit),
    );

    const snapshot = await getDocs(favoritesQuery);
    const favoriteIds = snapshot.docs.map((doc) => doc.id);

    return favoriteIds;
  } catch (error) {
    console.error("お気に入りリスト取得エラー:", error);
    return [];
  }
};

/**
 * ユーザーのお気に入りクリップ一覧を取得
 * @param userId ユーザーID
 * @param limit 取得件数の制限
 * @returns お気に入りクリップ一覧
 */
export const getFavoriteClips = async (
  userId: string,
  limit = 20,
): Promise<AudioClip[]> => {
  if (!userId) return [];

  try {
    // 既存API関数を使用してお気に入りクリップを取得
    const result = await apiFetchFavoriteClips(userId, {
      limit: limit,
    });

    return result.clips;
  } catch (error) {
    console.error("お気に入りクリップ一覧の取得に失敗しました:", error);
    return [];
  }
};

/**
 * クリップのお気に入り数をインクリメントする（内部関数）
 * @param clipId クリップID
 */
const incrementFavoriteCount = async (clipId: string): Promise<void> => {
  try {
    const db = getFirestoreInstance();
    if (!db) {
      throw new Error(
        "Firestoreデータベースインスタンスが初期化されていません",
      );
    }

    const clipRef = doc(db, "audioClips", clipId);

    await runTransaction(db, async (transaction) => {
      const clipDoc = await transaction.get(clipRef);
      if (!clipDoc.exists()) {
        throw new Error("該当するクリップが存在しません");
      }

      // favoriteCountフィールドをインクリメント
      transaction.update(clipRef, {
        favoriteCount: increment(1),
        updatedAt: serverTimestamp(),
      });
    });
  } catch (error) {
    console.error("お気に入り数の更新に失敗しました:", error);
  }
};

/**
 * クリップのお気に入り数をデクリメントする（内部関数）
 * @param clipId クリップID
 */
const decrementFavoriteCount = async (clipId: string): Promise<void> => {
  try {
    const db = getFirestoreInstance();
    if (!db) {
      throw new Error(
        "Firestoreデータベースインスタンスが初期化されていません",
      );
    }

    const clipRef = doc(db, "audioClips", clipId);

    await runTransaction(db, async (transaction) => {
      const clipDoc = await transaction.get(clipRef);
      if (!clipDoc.exists()) {
        throw new Error("該当するクリップが存在しません");
      }

      const currentCount = clipDoc.data()?.favoriteCount || 0;

      // 0未満にならないようにする
      const newCount = Math.max(0, currentCount - 1);

      transaction.update(clipRef, {
        favoriteCount: newCount,
        updatedAt: serverTimestamp(),
      });
    });
  } catch (error) {
    console.error("お気に入り数の更新に失敗しました:", error);
  }
};
