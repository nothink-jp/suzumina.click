"use server";

/**
 * タグ管理に関するServer Actions
 *
 * タグの検索や関連コンテンツの取得などのタグ管理機能を提供します
 */

import { getFirestore } from "firebase-admin/firestore";
import { initializeFirebaseAdmin } from "../auth/firebase-admin";
import { getCurrentUser } from "../auth/getCurrentUser";

/**
 * タグに関連するオーディオクリップを取得する
 *
 * @param tag 検索するタグ
 * @param limit 取得件数
 * @param startAfter ページネーション用カーソル
 * @returns タグに関連するオーディオクリップ
 */
export async function getAudioClipsByTag(
  tag: string,
  limit = 20,
  startAfter?: string,
) {
  try {
    // パラメータのバリデーション
    if (!tag || tag.trim().length === 0) {
      throw new Error("検索するタグが指定されていません");
    }

    const trimmedTag = tag.trim();

    // Firebase Admin SDKを初期化
    initializeFirebaseAdmin();
    const db = getFirestore();

    // 現在のユーザーを取得
    const currentUser = await getCurrentUser();

    // クエリの構築
    let query = db
      .collection("audioClips")
      .where("tags", "array-contains", trimmedTag)
      .orderBy("createdAt", "desc")
      .limit(limit);

    // 非ログインユーザーには公開クリップのみ表示
    if (!currentUser) {
      query = query.where("isPublic", "==", true);
    }

    // ページネーション
    if (startAfter) {
      const lastClipDoc = await db
        .collection("audioClips")
        .doc(startAfter)
        .get();
      if (lastClipDoc.exists) {
        query = query.startAfter(lastClipDoc);
      }
    }

    // クエリ実行
    const clipsSnapshot = await query.get();

    if (clipsSnapshot.empty) {
      return { clips: [], hasMore: false };
    }

    // 検索結果を整形
    const clips = clipsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate().toISOString(),
        updatedAt: data.updatedAt?.toDate().toISOString(),
      };
    });

    return {
      clips,
      hasMore: clips.length === limit,
      lastClip: clips.length > 0 ? clips[clips.length - 1].id : null,
    };
  } catch (error) {
    console.error("タグによるオーディオクリップ検索に失敗しました:", error);
    throw new Error(
      `タグによるオーディオクリップ検索に失敗しました: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}
