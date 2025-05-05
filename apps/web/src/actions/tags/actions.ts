"use server";

/**
 * タグ関連の共通Server Actions
 *
 * このファイルにはタグ関連の共通アクションをエクスポートします
 */

import { getFirestore } from "firebase-admin/firestore";
import { initializeFirebaseAdmin } from "../auth/firebase-admin";

// タグ関連の型定義
export interface TagData {
  id: string;
  name: string;
  count: number;
}

/**
 * 人気のタグを取得する
 *
 * @param limit 取得する件数
 * @returns タグデータの配列
 */
export async function getPopularTags(limit = 20): Promise<TagData[]> {
  try {
    // Firebase Admin SDKを初期化
    initializeFirebaseAdmin();
    const db = getFirestore();

    // 使用回数の降順でタグを取得
    const tagsSnapshot = await db
      .collection("tags")
      .orderBy("count", "desc")
      .limit(limit)
      .get();

    if (tagsSnapshot.empty) {
      return [];
    }

    // タグデータを配列に変換
    const tags = tagsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        count: data.count,
      };
    });

    return tags;
  } catch (error) {
    console.error("タグの取得に失敗しました:", error);
    throw new Error(
      `タグの取得に失敗しました: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

/**
 * タグ名から検索する
 *
 * @param query 検索クエリ
 * @param limit 取得する件数
 * @returns 検索結果のタグ配列
 */
export async function searchTags(
  query: string,
  limit = 10,
): Promise<TagData[]> {
  try {
    if (!query) {
      return [];
    }

    // Firebase Admin SDKを初期化
    initializeFirebaseAdmin();
    const db = getFirestore();

    // タグの前方一致検索
    const tagsSnapshot = await db
      .collection("tags")
      .orderBy("name")
      .startAt(query)
      .endAt(`${query}\uf8ff`)
      .limit(limit)
      .get();

    if (tagsSnapshot.empty) {
      return [];
    }

    // タグデータを配列に変換
    const tags = tagsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        count: data.count,
      };
    });

    return tags;
  } catch (error) {
    console.error("タグ検索に失敗しました:", error);
    throw new Error(
      `タグ検索に失敗しました: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

// タグ管理関連のアクションをエクスポート
export * from "./manage-tags";
