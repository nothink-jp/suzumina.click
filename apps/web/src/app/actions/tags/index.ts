"use server";

/**
 * タグ関連のServer Actions
 *
 * - searchTags: タグ検索機能
 * - getPopularTags: 人気タグ取得機能
 */

import type { TagApiResponse, TagInfo } from "@/lib/audioclips/types";
import { getFirestore } from "firebase-admin/firestore";
import { initializeFirebaseAdmin } from "../auth/firebase-admin";

// Firebaseの初期化とFirestoreの取得
// 注：initializeFirebaseAdminを実行して認証を初期化
initializeFirebaseAdmin();
// 引数なしでgetFirestoreを呼び出し、Firestoreインスタンスを取得
const adminDb = getFirestore();

/**
 * タグ検索
 * クエリに基づいてタグを検索し、結果を返します
 *
 * @param query 検索クエリ
 * @param limit 取得上限数（デフォルト10）
 * @returns タグ検索結果
 */
export async function searchTags(
  query: string,
  limit = 10,
): Promise<TagApiResponse> {
  try {
    // 検索クエリが空の場合は空の結果を返す
    if (!query) {
      return {
        tags: [],
        hasMore: false,
      };
    }

    // クエリの正規化
    const normalizedQuery = query
      .trim()
      .toLowerCase()
      // 英数字、日本語、ハイフン、アンダースコアのみ許可
      .replace(
        /[^\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\u3005-\u3006\u30E0-\u9FCF-]/g,
        "",
      )
      // 連続するハイフンやアンダースコアを1つにまとめる
      .replace(/[-_]{2,}/g, (match) => match[0]);

    // モックFirestoreのインターフェースに合わせたクエリの実行
    const tagsRef = adminDb.collection("tags");

    // 全てのタグを取得（実際のアプリではwhere句を使って効率化）
    const tagsQuery = tagsRef.limit(limit * 2);
    const snapshot = await tagsQuery.get();

    // タグ情報を抽出（実際にはモックの結果をフィルタリング）
    const tags: TagInfo[] = [];
    let matchCount = 0;

    // クライアント側でプレフィックスフィルタリングを実装
    for (const doc of snapshot.docs) {
      const docId = doc.id;
      // プレフィックスマッチのシミュレーション
      if (docId.startsWith(normalizedQuery) && tags.length < limit) {
        const data = doc.data();
        tags.push({
          id: docId,
          text: docId,
          count: (data.count as number) || 0,
        });
        matchCount++;
      }
    }

    return {
      tags,
      hasMore: matchCount > limit,
    };
  } catch (error) {
    console.error("タグ検索エラー:", error);
    throw new Error("タグの検索中にエラーが発生しました");
  }
}

/**
 * 人気タグ取得
 * 使用回数の多いタグを順に返します
 *
 * @param limit 取得上限数（デフォルト20）
 * @param timeRange 期間フィルタ（all, day, week, month）
 * @returns 人気タグリスト
 */
export async function getPopularTags(
  limit = 20,
  timeRange = "all",
): Promise<TagApiResponse> {
  try {
    // タグコレクションへの参照
    const tagsRef = adminDb.collection("tags");

    // モックFirestoreのインターフェースに合わせた実装
    // 全てのタグを取得し、クライアント側でソート
    const tagsQuery = tagsRef.limit(limit * 2);
    const snapshot = await tagsQuery.get();

    // 期間によるフィルタリング（現在はオプション）
    const now = new Date();
    let startDate: Date | null = null;

    if (timeRange !== "all") {
      switch (timeRange) {
        case "day":
          startDate = new Date(now);
          startDate.setDate(now.getDate() - 1);
          break;
        case "week":
          startDate = new Date(now);
          startDate.setDate(now.getDate() - 7);
          break;
        case "month":
          startDate = new Date(now);
          startDate.setMonth(now.getMonth() - 1);
          break;
      }
    }

    // タグ情報を抽出してソート
    const allTags: TagInfo[] = [];
    for (const doc of snapshot.docs) {
      const data = doc.data();

      // 期間フィルタ処理（実際のデータにlastUsedAtがある場合）
      if (startDate && data.lastUsedAt) {
        // Firestoreから取得したデータの型を適切に処理
        const lastUsedAt = data.lastUsedAt as string | number | Date;
        const lastUsedDate = new Date(lastUsedAt);
        if (lastUsedDate < startDate) continue;
      }

      allTags.push({
        id: doc.id,
        text: doc.id,
        count: (data.count as number) || 0,
      });
    }

    // カウント数でソート（降順）
    allTags.sort((a, b) => (b.count ?? 0) - (a.count ?? 0));

    // 上位limit件を取得
    const tags = allTags.slice(0, limit);

    return {
      tags,
      hasMore: allTags.length > limit,
    };
  } catch (error) {
    console.error("人気タグ取得エラー:", error);
    throw new Error("人気タグの取得中にエラーが発生しました");
  }
}
