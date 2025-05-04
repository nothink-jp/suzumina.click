"use server";

/**
 * クリップタグ操作用のServer Actions
 *
 * クリップのタグを取得・更新するための関数を提供します
 */

import { initializeFirebaseAdmin } from "@/app/actions/auth/firebase-admin";
import { getCurrentUser } from "@/app/actions/auth/getCurrentUser";
import { getFirestore } from "firebase-admin/firestore";
import type { Transaction } from "firebase-admin/firestore";
import { revalidatePath } from "next/cache";

/**
 * クリップのタグを取得する関数
 *
 * @param clipId クリップID
 * @returns タグ情報のオブジェクト (success: boolean, data?: {tags: string[]}, error?: string)
 */
export async function getClipTags(clipId: string) {
  try {
    // Firestore初期化
    initializeFirebaseAdmin();
    const adminDb = getFirestore();

    // クリップドキュメントの取得
    const clipDoc = await adminDb.collection("audioClips").doc(clipId).get();

    if (!clipDoc.exists) {
      return {
        success: false,
        error: "指定されたクリップが見つかりません",
      };
    }

    const clipData = clipDoc.data();
    const tags = clipData?.tags || [];

    // タグを返す
    return {
      success: true,
      data: { tags },
    };
  } catch (error) {
    console.error("タグ取得エラー:", error);
    return {
      success: false,
      error: "タグの取得中にエラーが発生しました",
    };
  }
}

/**
 * クリップのタグを更新する関数
 *
 * @param clipId クリップID
 * @param tags 設定するタグの配列
 * @returns 更新結果のオブジェクト (success: boolean, data?: {tags: string[]}, error?: string)
 */
export async function updateClipTags(clipId: string, tags: string[]) {
  try {
    // 認証チェック - Firebase認証を使用
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return {
        success: false,
        error: "認証が必要です",
      };
    }

    if (!Array.isArray(tags)) {
      return {
        success: false,
        error: "無効なタグリストです",
      };
    }

    // タグのバリデーション
    const MAX_TAG_LENGTH = 30;
    const MAX_TAGS = 10;

    // タグ数チェック
    if (tags.length > MAX_TAGS) {
      return {
        success: false,
        error: `タグは${MAX_TAGS}個までしか設定できません`,
      };
    }

    // タグを正規化して重複を排除
    const normalizedTags = [
      ...new Set(
        tags
          .map((tag) => (typeof tag === "string" ? tag : ""))
          .filter(Boolean)
          .map((tag) =>
            tag
              .trim()
              .toLowerCase()
              .replace(
                /[^\w\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF\u3005-\u3006\u30E0-\u9FCF-]/g,
                "",
              )
              .replace(/[-_]{2,}/g, (match) => match[0]),
          )
          .filter((tag) => tag.length > 0 && tag.length <= MAX_TAG_LENGTH),
      ),
    ];

    // Firestore初期化
    initializeFirebaseAdmin();
    const adminDb = getFirestore();

    // クリップドキュメントの取得
    const clipRef = adminDb.collection("audioClips").doc(clipId);
    const clipDoc = await clipRef.get();

    if (!clipDoc.exists) {
      return {
        success: false,
        error: "指定されたクリップが見つかりません",
      };
    }

    const clipData = clipDoc.data();

    // データがない場合のチェック
    if (!clipData) {
      return {
        success: false,
        error: "クリップデータが無効です",
      };
    }

    // 所有者チェック - Firebase UIDを使用
    if (clipData.userId !== currentUser.uid) {
      return {
        success: false,
        error: "このクリップを編集する権限がありません",
      };
    }

    // トランザクションでタグを更新
    await adminDb.runTransaction(async (transaction: Transaction) => {
      // クリップのタグを更新
      transaction.update(clipRef, {
        tags: normalizedTags,
        updatedAt: new Date(),
      });

      // タグ統計の更新 (オプション機能)
      const oldTags = clipData.tags || [];

      // 削除されたタグのカウントを減らす
      const removedTags = oldTags.filter(
        (tag: string) => !normalizedTags.includes(tag),
      );
      for (const tag of removedTags) {
        const tagRef = adminDb.collection("tags").doc(tag);
        const tagDoc = await transaction.get(tagRef);

        if (tagDoc.exists) {
          const currentCount = tagDoc.data()?.count || 1;
          if (currentCount <= 1) {
            // カウントが0になる場合はドキュメントを削除
            transaction.delete(tagRef);
          } else {
            transaction.update(tagRef, {
              count: currentCount - 1,
            });
          }
        }
      }

      // 新規追加されたタグのカウントを増やす
      const addedTags = normalizedTags.filter(
        (tag: string) => !oldTags.includes(tag),
      );
      for (const tag of addedTags) {
        const tagRef = adminDb.collection("tags").doc(tag);
        const tagDoc = await transaction.get(tagRef);

        if (tagDoc.exists) {
          const currentCount = tagDoc.data()?.count || 0;
          transaction.update(tagRef, {
            count: currentCount + 1,
          });
        } else {
          transaction.set(tagRef, {
            id: tag,
            count: 1,
            createdAt: new Date(),
          });
        }
      }
    });

    // キャッシュを更新
    revalidatePath(`/audioclips/${clipId}`);

    // 更新後のタグを返す
    return {
      success: true,
      data: { tags: normalizedTags },
    };
  } catch (error) {
    console.error("タグ更新エラー:", error);
    return {
      success: false,
      error: "タグの更新中にエラーが発生しました",
    };
  }
}
