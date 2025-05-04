"use server";

/**
 * オーディオクリップのタグ関連のServer Actions
 *
 * - getAudioClipTags: クリップのタグを取得
 * - updateAudioClipTags: クリップのタグを更新
 */

// 既存の認証・データベース関連のインポートを修正
import { initializeFirebaseAdmin } from "@/app/actions/auth/firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import type {
  DocumentData,
  DocumentReference,
  Transaction,
} from "firebase-admin/firestore";

// Firebase初期化とFirestoreの取得
initializeFirebaseAdmin();
const adminDb = getFirestore();

/**
 * セッション情報を取得する簡易関数
 *
 * @returns セッション情報
 */
async function getSessionInfo() {
  // ダミーのセッション情報を返す
  return {
    user: {
      id: "test-user-123",
      email: "test@example.com",
      name: "テストユーザー",
    },
  };
}

/**
 * クリップのタグを取得
 *
 * @param clipId クリップID
 * @returns タグリスト
 */
export async function getAudioClipTags(clipId: string) {
  try {
    // クリップドキュメントの取得
    const clipDoc = await adminDb.collection("audioClips").doc(clipId).get();

    if (!clipDoc.exists) {
      return {
        success: false,
        error: "指定されたクリップが見つかりません",
      };
    }

    const clipData = clipDoc.data();
    // タグが配列でない場合は空配列を返す
    const tags = Array.isArray(clipData?.tags) ? clipData?.tags : [];

    return {
      success: true,
      tags,
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
 * クリップのタグを更新
 * - 認証が必要
 * - クリップの所有者のみが更新可能
 *
 * @param clipId クリップID
 * @param tags 更新するタグリスト
 * @returns 更新結果
 */
export async function updateAudioClipTags(clipId: string, tags: string[]) {
  try {
    // 認証チェック
    const session = await getSessionInfo();
    if (!session || !session.user) {
      return {
        success: false,
        error: "認証が必要です",
      };
    }

    // タグのバリデーション
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
    if (!clipData) {
      return {
        success: false,
        error: "クリップデータが存在しません",
      };
    }

    // 所有者チェック
    if (clipData.userId !== session.user.id) {
      return {
        success: false,
        error: "このクリップを編集する権限がありません",
      };
    }

    // トランザクションでタグを更新
    // タグドキュメントの型
    interface TagDocument {
      id: string;
      count: number;
      createdAt: Date;
    }

    await adminDb.runTransaction(async (transaction: Transaction) => {
      // クリップのタグを更新
      transaction.update(clipRef as DocumentReference<DocumentData>, {
        tags: normalizedTags,
        updatedAt: new Date(),
      });

      // タグ統計の更新
      // クリップのタグデータを明示的に型変換して安全にアクセス
      const oldTags: string[] = Array.isArray(clipData.tags)
        ? clipData.tags
        : [];

      // 削除されたタグのカウントを減らす
      const removedTags: string[] = oldTags.filter(
        (tag) => !normalizedTags.includes(tag),
      );
      for (const tag of removedTags) {
        const tagRef = adminDb.collection("tags").doc(tag);
        const tagDoc = await transaction.get(
          tagRef as DocumentReference<DocumentData>,
        );

        if (tagDoc.exists) {
          const tagData = tagDoc.data();
          const currentCount: number =
            typeof tagData?.count === "number" ? tagData.count : 1;

          if (currentCount <= 1) {
            // カウントが0になる場合はドキュメントを削除
            transaction.delete(tagRef as DocumentReference<DocumentData>);
          } else {
            transaction.update(tagRef as DocumentReference<DocumentData>, {
              count: currentCount - 1,
            });
          }
        }
      }

      // 新規追加されたタグのカウントを増やす
      const addedTags: string[] = normalizedTags.filter(
        (tag) => !oldTags.includes(tag),
      );
      for (const tag of addedTags) {
        const tagRef = adminDb.collection("tags").doc(tag);
        const tagDoc = await transaction.get(
          tagRef as DocumentReference<DocumentData>,
        );

        if (tagDoc.exists) {
          const tagData = tagDoc.data();
          const currentCount: number =
            typeof tagData?.count === "number" ? tagData.count : 0;

          transaction.update(tagRef as DocumentReference<DocumentData>, {
            count: currentCount + 1,
          });
        } else {
          const newTag: TagDocument = {
            id: tag,
            count: 1,
            createdAt: new Date(),
          };
          transaction.set(tagRef as DocumentReference<DocumentData>, newTag);
        }
      }
    });

    // 更新後のタグを返す
    return {
      success: true,
      tags: normalizedTags,
    };
  } catch (error) {
    console.error("タグ更新エラー:", error);
    return {
      success: false,
      error: "タグの更新中にエラーが発生しました",
    };
  }
}
