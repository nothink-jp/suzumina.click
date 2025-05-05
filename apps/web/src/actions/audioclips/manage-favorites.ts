"use server";

/**
 * お気に入り管理に関するServer Actions
 *
 * オーディオクリップのお気に入り登録・削除・取得などの管理機能を提供します
 */

import { getFirestore } from "firebase-admin/firestore";
import { revalidatePath } from "next/cache";
import { initializeFirebaseAdmin } from "../auth/firebase-admin";
import { getCurrentUser } from "../auth/getCurrentUser";

/**
 * お気に入りに追加/削除する
 *
 * @param clipId クリップID
 * @returns 操作結果
 */
export async function toggleFavorite(clipId: string) {
  try {
    // 認証チェック
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new Error("認証が必要です");
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
    if (!clipData) {
      throw new Error("クリップデータを取得できませんでした");
    }

    // お気に入りコレクションのドキュメント参照
    const favoriteRef = db
      .collection("userFavorites")
      .doc(currentUser.uid)
      .collection("audioClips")
      .doc(clipId);

    // お気に入りの状態をチェック
    const favoriteDoc = await favoriteRef.get();
    const isFavorite = favoriteDoc.exists;

    // トランザクションで操作
    await db.runTransaction(async (transaction) => {
      if (isFavorite) {
        // お気に入りから削除
        transaction.delete(favoriteRef);
        // カウントを減らす
        transaction.update(clipDoc.ref, {
          favoriteCount: Math.max((clipData.favoriteCount || 0) - 1, 0),
        });
      } else {
        // お気に入りに追加
        transaction.set(favoriteRef, {
          clipId: clipId,
          videoId: clipData.videoId,
          addedAt: new Date(),
        });
        // カウントを増やす
        transaction.update(clipDoc.ref, {
          favoriteCount: (clipData.favoriteCount || 0) + 1,
        });
      }
    });

    // キャッシュを更新
    revalidatePath(`/videos/${clipData.videoId}`);
    revalidatePath("/favorites");

    return {
      clipId: clipId,
      isFavorite: !isFavorite,
      message: !isFavorite
        ? "お気に入りに追加しました"
        : "お気に入りから削除しました",
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
 * お気に入りの状態を確認する
 *
 * @param clipId クリップID
 * @returns お気に入り状態
 */
export async function checkFavoriteStatus(clipId: string) {
  try {
    // 認証チェック
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { isFavorite: false };
    }

    // Firebase Admin SDKを初期化
    initializeFirebaseAdmin();
    const db = getFirestore();

    // お気に入りの状態をチェック
    const favoriteDoc = await db
      .collection("userFavorites")
      .doc(currentUser.uid)
      .collection("audioClips")
      .doc(clipId)
      .get();

    return {
      isFavorite: favoriteDoc.exists,
      clipId: clipId,
    };
  } catch (error) {
    console.error("お気に入り状態の確認に失敗しました:", error);
    return { isFavorite: false };
  }
}

/**
 * ユーザーのお気に入りクリップを取得する
 *
 * @param limit 取得する件数
 * @param startAfter カーソル（ページネーション用）
 * @returns お気に入りクリップ一覧
 */
export async function getUserFavorites(limit = 10, startAfter?: Date) {
  try {
    // 認証チェック
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new Error("認証が必要です");
    }

    // Firebase Admin SDKを初期化
    initializeFirebaseAdmin();
    const db = getFirestore();

    // クエリ構築
    let query = db
      .collection("userFavorites")
      .doc(currentUser.uid)
      .collection("audioClips")
      .orderBy("addedAt", "desc")
      .limit(limit);

    // ページネーション
    if (startAfter) {
      query = query.startAfter(startAfter);
    }

    // お気に入りリストを取得
    const favoritesSnapshot = await query.get();

    if (favoritesSnapshot.empty) {
      return { favorites: [], hasMore: false };
    }

    // クリップIDの配列を作成
    const clipIds = favoritesSnapshot.docs.map((doc) => doc.id);

    // 各クリップの詳細情報を取得
    const clipsPromises = clipIds.map((clipId) =>
      db.collection("audioClips").doc(clipId).get(),
    );

    const clipsSnapshots = await Promise.all(clipsPromises);

    // 結果を整形
    const favorites = clipsSnapshots
      .filter((doc) => doc.exists)
      .map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data?.createdAt?.toDate().toISOString(),
          updatedAt: data?.updatedAt?.toDate().toISOString(),
        };
      });

    // ページネーション情報
    const lastFavorite =
      favoritesSnapshot.docs[favoritesSnapshot.docs.length - 1];
    const lastAddedAt = lastFavorite?.data().addedAt;

    return {
      favorites,
      hasMore: favorites.length === limit,
      lastAddedAt: lastAddedAt ? lastAddedAt.toDate() : null,
    };
  } catch (error) {
    console.error("お気に入り一覧の取得に失敗しました:", error);
    throw new Error(
      `お気に入り一覧の取得に失敗しました: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}
