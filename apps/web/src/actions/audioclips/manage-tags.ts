"use server";

/**
 * タグ管理に関するServer Actions
 *
 * オーディオクリップのタグ取得・更新・検証などのタグ管理機能を提供します
 */

import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { revalidatePath } from "next/cache";
import { initializeFirebaseAdmin } from "../../actions/auth/firebase-admin";
import { getCurrentUser } from "../../actions/auth/getCurrentUser";

/**
 * クリップのタグを取得する
 *
 * @param clipId クリップID
 * @returns 操作結果
 */
export async function getClipTags(clipId: string) {
  try {
    // パラメータのバリデーション
    if (!clipId) {
      return { success: false, error: "クリップIDが必要です" };
    }

    // Firebase Admin SDKを初期化
    initializeFirebaseAdmin();
    const db = getFirestore();

    // クリップを取得
    const clipDoc = await db.collection("audioClips").doc(clipId).get();

    if (!clipDoc.exists) {
      return { success: false, error: "指定されたクリップが見つかりません" };
    }

    const clipData = clipDoc.data();
    const tags = clipData?.tags || [];

    return {
      success: true,
      data: { tags },
    };
  } catch (error) {
    console.error("タグの取得中にエラーが発生しました:", error);
    return {
      success: false,
      error: "タグの取得中にエラーが発生しました",
    };
  }
}

/**
 * クリップのタグを更新する
 *
 * @param clipId クリップID
 * @param tags 設定するタグの配列
 * @returns 操作結果
 */
export async function updateClipTags(clipId: string, tags: string[]) {
  try {
    // 認証チェック
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "認証が必要です" };
    }

    // パラメータのバリデーション
    if (!clipId) {
      return { success: false, error: "クリップIDが必要です" };
    }

    // タグの最大数チェック
    if (tags.length > 10) {
      return { success: false, error: "タグは10個までしか設定できません" };
    }

    // タグの正規化
    const normalizedTags = tags
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0 && tag.length <= 30) // 空文字を除去し、長すぎるタグを除外
      .map((tag) => tag.replace(/[^\w\s\-_]/g, "")) // 特殊文字を除去（アルファベット、数字、アンダースコア、ハイフン、スペースのみ許可）
      .filter((tag, index, self) => self.indexOf(tag) === index); // 重複を除去

    // Firebase Admin SDKを初期化
    initializeFirebaseAdmin();
    const db = getFirestore();

    // クリップを取得
    const clipDoc = await db.collection("audioClips").doc(clipId).get();

    if (!clipDoc.exists) {
      return { success: false, error: "指定されたクリップが存在しません" };
    }

    const clipData = clipDoc.data();

    // クリップの所有者のみがタグを更新可能
    if (clipData && clipData.userId !== currentUser.uid) {
      return {
        success: false,
        error: "このクリップを編集する権限がありません",
      };
    }

    // 既存のタグを取得
    const existingTags = clipData?.tags || [];

    // トランザクションでタグを更新
    await db.runTransaction(async (transaction) => {
      // クリップのタグを更新
      transaction.update(clipDoc.ref, {
        tags: normalizedTags,
        updatedAt: FieldValue.serverTimestamp(),
      });

      // 削除されたタグのカウントを減らす
      for (const tag of existingTags) {
        if (!normalizedTags.includes(tag)) {
          const tagDocRef = db.collection("tags").doc(tag);
          const tagDoc = await transaction.get(tagDocRef);

          if (tagDoc.exists) {
            const currentCount = tagDoc.data()?.count || 0;
            if (currentCount <= 1) {
              transaction.delete(tagDocRef);
            } else {
              transaction.update(tagDocRef, {
                count: FieldValue.increment(-1),
              });
            }
          }
        }
      }

      // 新しく追加されたタグのカウントを増やす
      for (const tag of normalizedTags) {
        if (!existingTags.includes(tag)) {
          const tagDocRef = db.collection("tags").doc(tag);
          const tagDoc = await transaction.get(tagDocRef);

          if (tagDoc.exists) {
            transaction.update(tagDocRef, {
              count: FieldValue.increment(1),
            });
          } else {
            transaction.set(tagDocRef, {
              name: tag,
              count: 1,
            });
          }
        }
      }
    });

    // キャッシュを更新
    if (clipData?.videoId) {
      revalidatePath(`/videos/${clipData.videoId}`);
    }
    revalidatePath(`/audioclips/${clipId}`);

    return {
      success: true,
      data: { tags: normalizedTags },
      message: "タグが更新されました",
    };
  } catch (error) {
    console.error("タグの更新中にエラーが発生しました:", error);
    return {
      success: false,
      error: "タグの更新中にエラーが発生しました",
    };
  }
}

/**
 * クリップにタグを追加する
 *
 * @param clipId クリップID
 * @param tags 追加するタグの配列
 * @returns 操作結果
 */
export async function addTagsToClip(clipId: string, tags: string[]) {
  try {
    // 認証チェック
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new Error("認証が必要です");
    }

    // パラメータのバリデーション
    if (!clipId) {
      throw new Error("クリップIDが必要です");
    }

    if (!Array.isArray(tags) || tags.length === 0) {
      throw new Error("追加するタグが指定されていません");
    }

    // タグの形式をバリデーション
    const validTags = tags
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0);

    if (validTags.length === 0) {
      throw new Error("有効なタグが指定されていません");
    }

    // Firebase Admin SDKを初期化
    initializeFirebaseAdmin();
    const db = getFirestore();

    // クリップを取得
    const clipDoc = await db.collection("audioClips").doc(clipId).get();

    if (!clipDoc.exists) {
      throw new Error("指定されたクリップが存在しません");
    }

    const clipData = clipDoc.data();

    // クリップの所有者のみがタグを追加可能
    if (clipData && clipData.userId !== currentUser.uid) {
      throw new Error("このクリップにタグを追加する権限がありません");
    }

    // 既存のタグを取得
    const existingTags = clipData?.tags || [];

    // 新しいタグを追加（重複を排除）
    const newTags = Array.from(new Set([...existingTags, ...validTags]));

    // トランザクションでタグを追加
    await db.runTransaction(async (transaction) => {
      // クリップにタグを設定
      transaction.update(clipDoc.ref, {
        tags: newTags,
        updatedAt: FieldValue.serverTimestamp(),
      });

      // 各タグのカウントを増やす
      for (const tag of validTags) {
        if (!existingTags.includes(tag)) {
          const tagDocRef = db.collection("tags").doc(tag);
          const tagDoc = await transaction.get(tagDocRef);

          if (tagDoc.exists) {
            transaction.update(tagDocRef, {
              count: FieldValue.increment(1),
            });
          } else {
            transaction.set(tagDocRef, {
              name: tag,
              count: 1,
            });
          }
        }
      }
    });

    // キャッシュを更新
    if (clipData?.videoId) {
      revalidatePath(`/videos/${clipData.videoId}`);
    }
    revalidatePath(`/audioclips/${clipId}`);

    return {
      clipId,
      tags: newTags,
      message: "タグが追加されました",
    };
  } catch (error) {
    console.error("タグの追加に失敗しました:", error);
    throw new Error(
      `タグの追加に失敗しました: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

/**
 * クリップからタグを削除する
 *
 * @param clipId クリップID
 * @param tag 削除するタグ
 * @returns 操作結果
 */
export async function removeTagFromClip(clipId: string, tag: string) {
  try {
    // 認証チェック
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new Error("認証が必要です");
    }

    // パラメータのバリデーション
    if (!clipId) {
      throw new Error("クリップIDが必要です");
    }

    if (!tag || tag.trim().length === 0) {
      throw new Error("削除するタグが指定されていません");
    }

    const trimmedTag = tag.trim();

    // Firebase Admin SDKを初期化
    initializeFirebaseAdmin();
    const db = getFirestore();

    // クリップを取得
    const clipDoc = await db.collection("audioClips").doc(clipId).get();

    if (!clipDoc.exists) {
      throw new Error("指定されたクリップが存在しません");
    }

    const clipData = clipDoc.data();

    // クリップの所有者のみがタグを削除可能
    if (clipData && clipData.userId !== currentUser.uid) {
      throw new Error("このクリップのタグを削除する権限がありません");
    }

    // 既存のタグを取得
    const existingTags = clipData?.tags || [];

    // タグが存在しない場合
    if (!existingTags.includes(trimmedTag)) {
      return {
        clipId,
        tags: existingTags,
        message: "指定されたタグは既に存在しません",
      };
    }

    // 削除後のタグリスト
    const updatedTags = existingTags.filter((t: string) => t !== trimmedTag);

    // トランザクションでタグを削除
    await db.runTransaction(async (transaction) => {
      // クリップのタグを更新
      transaction.update(clipDoc.ref, {
        tags: updatedTags,
        updatedAt: FieldValue.serverTimestamp(),
      });

      // タグのカウントを減らす
      const tagDocRef = db.collection("tags").doc(trimmedTag);
      const tagDoc = await transaction.get(tagDocRef);

      if (tagDoc.exists) {
        const currentCount = tagDoc.data()?.count || 0;

        if (currentCount <= 1) {
          // カウントが0になるならドキュメントを削除
          transaction.delete(tagDocRef);
        } else {
          // カウントを減らす
          transaction.update(tagDocRef, {
            count: FieldValue.increment(-1),
          });
        }
      }
    });

    // キャッシュを更新
    if (clipData?.videoId) {
      revalidatePath(`/videos/${clipData.videoId}`);
    }
    revalidatePath(`/audioclips/${clipId}`);

    return {
      clipId,
      tags: updatedTags,
      message: "タグが削除されました",
    };
  } catch (error) {
    console.error("タグの削除に失敗しました:", error);
    throw new Error(
      `タグの削除に失敗しました: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

/**
 * タグでオーディオクリップを検索する
 *
 * @param tag 検索するタグ
 * @param limit 取得する件数
 * @returns タグに関連するオーディオクリップ
 */
export async function getClipsByTag(tag: string, limit = 10) {
  try {
    if (!tag || tag.trim().length === 0) {
      throw new Error("検索するタグが指定されていません");
    }

    const trimmedTag = tag.trim();

    // Firebase Admin SDKを初期化
    initializeFirebaseAdmin();
    const db = getFirestore();

    // 現在のユーザーを取得
    const currentUser = await getCurrentUser();

    // タグを含むクリップを取得
    let query = db
      .collection("audioClips")
      .where("tags", "array-contains", trimmedTag)
      .orderBy("createdAt", "desc")
      .limit(limit);

    // 非ログインユーザーまたは他のユーザーのクリップは公開のもののみ表示
    if (!currentUser) {
      query = query.where("isPublic", "==", true);
    }

    const clipsSnapshot = await query.get();

    if (clipsSnapshot.empty) {
      return { clips: [] };
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

    return { clips };
  } catch (error) {
    console.error("タグによるクリップ検索に失敗しました:", error);
    throw new Error(
      `タグによるクリップ検索に失敗しました: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}
