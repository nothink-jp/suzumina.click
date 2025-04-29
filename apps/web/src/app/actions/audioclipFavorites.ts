"use server";

import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { revalidatePath } from "next/cache";
import { initializeFirebaseAdmin } from "../api/auth/firebase-admin";
import { getCurrentUser } from "../api/auth/getCurrentUser";

/**
 * お気に入り状態を設定する
 *
 * @param clipId クリップID
 * @param isFavorite お気に入り登録する場合はtrue、解除する場合はfalse
 * @returns 設定結果
 */
export async function setFavoriteStatus(clipId: string, isFavorite: boolean) {
  try {
    // 認証チェック
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new Error("認証が必要です");
    }

    if (!clipId) {
      throw new Error("クリップIDが必要です");
    }

    // Firebase Admin SDKを初期化
    initializeFirebaseAdmin();
    const db = getFirestore();

    // クリップの存在確認
    const clipDoc = await db.collection("audioClips").doc(clipId).get();

    if (!clipDoc.exists) {
      throw new Error("指定されたクリップが存在しません");
    }

    const clipData = clipDoc.data();
    const userId = currentUser.uid;
    const favoriteId = `${userId}_${clipId}`;

    if (isFavorite) {
      // お気に入り登録
      await db
        .collection("audioClips")
        .doc(clipId)
        .update({
          favoriteCount: FieldValue.increment(1),
        });

      await db.collection("audioClipFavorites").doc(favoriteId).set({
        userId,
        clipId,
        createdAt: FieldValue.serverTimestamp(),
      });
    } else {
      // お気に入り解除
      await db
        .collection("audioClips")
        .doc(clipId)
        .update({
          favoriteCount: FieldValue.increment(-1),
        });

      await db.collection("audioClipFavorites").doc(favoriteId).delete();
    }

    // キャッシュを更新
    if (clipData?.videoId) {
      revalidatePath(`/videos/${clipData.videoId}`);
    }

    return {
      id: clipId,
      message: isFavorite
        ? "クリップがお気に入りに追加されました"
        : "クリップがお気に入りから削除されました",
      isFavorite,
    };
  } catch (error) {
    console.error("お気に入り操作に失敗しました:", error);
    throw new Error(
      `お気に入り操作に失敗しました: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

/**
 * お気に入り状態を確認する
 *
 * @param clipId クリップID
 * @returns お気に入り状態
 */
export async function checkFavoriteStatus(clipId: string) {
  try {
    // 認証チェック
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return {
        isFavorite: false,
      };
    }

    if (!clipId) {
      throw new Error("クリップIDが必要です");
    }

    // Firebase Admin SDKを初期化
    initializeFirebaseAdmin();
    const db = getFirestore();

    const userId = currentUser.uid;
    const favoriteId = `${userId}_${clipId}`;

    const favoriteDoc = await db
      .collection("audioClipFavorites")
      .doc(favoriteId)
      .get();

    return {
      isFavorite: favoriteDoc.exists,
    };
  } catch (error) {
    console.error("お気に入り状態の確認に失敗しました:", error);
    return {
      isFavorite: false,
    };
  }
}

/**
 * ユーザーのお気に入りクリップ一覧を取得する
 *
 * @param params 取得パラメータ
 * @returns お気に入りクリップ一覧
 */
export async function getFavoriteClips(params: {
  limit?: number;
  startAfter?: Date | null;
}) {
  try {
    // 認証チェック
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new Error("認証が必要です");
    }

    const { limit = 10, startAfter } = params;

    // Firebase Admin SDKを初期化
    initializeFirebaseAdmin();
    const db = getFirestore();

    // お気に入り一覧を取得
    let favoritesQuery = db
      .collection("audioClipFavorites")
      .where("userId", "==", currentUser.uid)
      .orderBy("createdAt", "desc")
      .limit(limit);

    if (startAfter) {
      favoritesQuery = favoritesQuery.startAfter(startAfter);
    }

    const favoritesSnapshot = await favoritesQuery.get();
    const clipIds = favoritesSnapshot.docs.map((doc) => doc.data().clipId);

    if (clipIds.length === 0) {
      return {
        clips: [],
        hasMore: false,
      };
    }

    // クリップIDを使って実際のクリップデータを取得
    const clips = [];

    // Firestoreは「in」クエリで最大10個までしか指定できないため、
    // 必要に応じてバッチ処理する
    const batchSize = 10;
    for (let i = 0; i < clipIds.length; i += batchSize) {
      const batch = clipIds.slice(i, i + batchSize);

      const clipsSnapshot = await db
        .collection("audioClips")
        .where("__name__", "in", batch)
        .get();

      for (const doc of clipsSnapshot.docs) {
        const data = doc.data();
        clips.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate().toISOString(),
          updatedAt: data.updatedAt?.toDate().toISOString(),
        });
      }
    }

    return {
      clips,
      hasMore: clipIds.length === limit,
      lastClip: clips.length > 0 ? clips[clips.length - 1] : null,
    };
  } catch (error) {
    console.error("お気に入りクリップの取得に失敗しました:", error);
    throw new Error(
      `お気に入りクリップの取得に失敗しました: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}
