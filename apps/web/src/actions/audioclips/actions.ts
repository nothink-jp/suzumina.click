/**
 * オーディオクリップ関連の共通Server Actions
 *
 * このファイルにはオーディオクリップ関連の共通アクションをエクスポートします
 */

import { formatErrorMessage, getFirestoreAdmin } from "@/lib/firebase/admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import type { DocumentData, Firestore, Query } from "firebase-admin/firestore";
import { getCurrentUser } from "../auth/getCurrentUser";

// 注: "use server" ディレクティブを含むファイルでの再エクスポートは許可されていないため、
// 個別のファイルで "use server" ディレクティブを使用する必要があります。

interface AudioClipData {
  videoId: string;
  title: string;
  phrase?: string;
  description?: string;
  startTime: number;
  endTime: number;
  isPublic?: boolean;
  tags?: string[];
}

interface GetAudioClipsParams {
  videoId?: string | null;
  userId?: string | null;
  limit?: number;
  startAfter?: Date | null;
}

/**
 * 音声クリップ一覧を取得する
 *
 * @param params 取得パラメータ
 * @returns 音声クリップ一覧
 */
export async function getAudioClips(params: GetAudioClipsParams) {
  try {
    const { videoId, userId, limit = 10, startAfter } = params;

    if (!videoId && !userId) {
      throw new Error("videoIdまたはuserIdが必要です");
    }

    // ヘルパー関数を使用してFirestoreを初期化
    const db = await getFirestoreAdmin();
    console.log("Firestoreの接続に成功しました");

    // 現在のユーザーを取得
    const currentUser = await getCurrentUser();
    console.log(
      "getAudioClips 認証状態:",
      currentUser ? `認証済み (${currentUser.uid})` : "未認証",
    );

    // クエリ条件の構築
    const clipsCollection = db.collection("audioClips");

    // クエリの構築を段階的に行う
    let queryBuilder: Query<DocumentData> = clipsCollection;

    if (videoId) {
      queryBuilder = queryBuilder.where("videoId", "==", videoId);
    }

    if (userId) {
      queryBuilder = queryBuilder.where("userId", "==", userId);
    }

    // 非公開クリップの表示条件
    // 自分のクリップを取得する場合のみ非公開も含める
    if (!currentUser || (userId && currentUser.uid !== userId)) {
      queryBuilder = queryBuilder.where("isPublic", "==", true);
    }

    // 作成日時の降順で取得
    queryBuilder = queryBuilder.orderBy("createdAt", "desc").limit(limit);

    // ページネーション
    if (startAfter) {
      const startAfterTimestamp = Timestamp.fromDate(startAfter);
      queryBuilder = queryBuilder.startAfter(startAfterTimestamp);
    }

    try {
      const snapshot = await queryBuilder.get();

      // 単純な構造のオブジェクトに変換（プリミティブ型と標準オブジェクトのみ）
      const clips = snapshot.docs.map((doc) => {
        const data = doc.data();

        // 純粋なJSONオブジェクトを作成
        return {
          id: doc.id,
          videoId: data.videoId || "",
          title: data.title || "",
          phrase: data.phrase || "",
          description: data.description || "",
          startTime: typeof data.startTime === "number" ? data.startTime : 0,
          endTime: typeof data.endTime === "number" ? data.endTime : 0,
          userId: data.userId || "",
          userName: data.userName || "名無しユーザー",
          userPhotoURL: data.userPhotoURL || null,
          isPublic: !!data.isPublic,
          tags: Array.isArray(data.tags) ? data.tags : [],
          playCount: typeof data.playCount === "number" ? data.playCount : 0,
          favoriteCount:
            typeof data.favoriteCount === "number" ? data.favoriteCount : 0,
          // タイムスタンプを文字列に変換
          createdAt:
            data.createdAt && typeof data.createdAt.toDate === "function"
              ? data.createdAt.toDate().toISOString()
              : new Date().toISOString(),
          updatedAt:
            data.updatedAt && typeof data.updatedAt.toDate === "function"
              ? data.updatedAt.toDate().toISOString()
              : new Date().toISOString(),
          lastPlayedAt:
            data.lastPlayedAt && typeof data.lastPlayedAt.toDate === "function"
              ? data.lastPlayedAt.toDate().toISOString()
              : undefined,
        };
      });

      // 次のページがあるかどうか
      const hasMore = clips.length === limit;

      // 最後のクリップ
      const lastClip = clips.length > 0 ? clips[clips.length - 1] : null;

      // オブジェクトを完全にシリアライズ可能にするため、一度文字列化してからパースする
      const result = {
        clips,
        hasMore,
        lastClip,
      };

      // プロトタイプを完全に削除
      return JSON.parse(JSON.stringify(result));
    } catch (queryError) {
      console.error("Firestoreクエリの実行に失敗しました:", queryError);
      throw new Error(
        await formatErrorMessage(
          "音声クリップの取得に失敗しました",
          queryError,
        ),
      );
    }
  } catch (error) {
    console.error("音声クリップの取得中に予期せぬエラーが発生しました:", error);
    throw new Error(
      await formatErrorMessage("音声クリップの取得に失敗しました", error),
    );
  }
}

/**
 * 音声クリップを作成する
 *
 * @param data 音声クリップデータ
 * @returns 作成された音声クリップ
 */
export async function createAudioClip(data: AudioClipData) {
  try {
    console.log("createAudioClip: 音声クリップ作成開始", {
      videoId: data.videoId,
      title: data.title,
      startTime: data.startTime,
      endTime: data.endTime,
    });

    // 認証チェック - 改善されたヘルパー関数を使用
    const currentUser = await checkAndLogAuthInfo("createAudioClip");
    if (!currentUser) {
      throw new Error("認証が必要です");
    }

    const {
      videoId,
      title,
      phrase,
      description,
      startTime,
      endTime,
      isPublic,
      tags,
    } = data;

    // 必須パラメータのバリデーション
    if (
      !videoId ||
      !title ||
      startTime === undefined ||
      endTime === undefined
    ) {
      throw new Error("必須パラメータが不足しています");
    }

    // 時間のバリデーション
    if (
      typeof startTime !== "number" ||
      typeof endTime !== "number" ||
      startTime >= endTime
    ) {
      throw new Error("開始時間は終了時間より前である必要があります");
    }

    // ヘルパー関数を使用してFirestoreを初期化
    const db = await getFirestoreAdmin();

    // 動画の存在確認
    try {
      const videoDoc = await db.collection("videos").doc(videoId).get();
      if (!videoDoc.exists) {
        throw new Error("指定された動画が存在しません");
      }
    } catch (videoError) {
      console.error("動画データの取得に失敗しました:", videoError);
      throw new Error(
        await formatErrorMessage("動画データの取得に失敗しました", videoError),
      );
    }

    // 重複チェック
    const { isOverlapping, overlappingClips } = await checkTimeRangeOverlap(
      db,
      videoId,
      startTime,
      endTime,
    );

    if (isOverlapping) {
      throw new Error(
        `指定された時間範囲は既存のクリップと重複しています: ${overlappingClips
          .map((clip) => clip.title)
          .join(", ")}`,
      );
    }

    // 新しいクリップを作成
    const now = FieldValue.serverTimestamp();
    const newClip = {
      videoId,
      title,
      phrase: phrase || "",
      description: description || "",
      startTime,
      endTime,
      userId: currentUser.uid,
      userName: currentUser.displayName || "名無しユーザー",
      userPhotoURL: currentUser.photoURL || null,
      isPublic: isPublic !== false, // デフォルトは公開
      tags: tags || [],
      playCount: 0,
      favoriteCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    try {
      const docRef = await db.collection("audioClips").add(newClip);

      // 再生時間（秒）を計算
      const duration = endTime - startTime;

      // フォーマット済みの再生時間を作成
      const minutes = Math.floor(duration / 60);
      const seconds = Math.floor(duration % 60);
      const formattedDuration = `${minutes}:${seconds.toString().padStart(2, "0")}`;

      // 現在の日時をISO文字列で取得（Date型からstring型への変換）
      const now = new Date();
      const nowISOString = now.toISOString();

      // 作成されたクリップのレスポンス用データを作成
      // サーバーコンポーネントからクライアントコンポーネントに渡すデータは
      // 純粋なJSONオブジェクトである必要があるため、FieldValueなどのオブジェクトは変換する
      const responseData = {
        id: docRef.id,
        videoId,
        title,
        phrase: phrase || "",
        description: description || "",
        startTime,
        endTime,
        userId: currentUser.uid,
        userName: currentUser.displayName || "名無しユーザー",
        userPhotoURL: currentUser.photoURL || null,
        isPublic: isPublic !== false,
        tags: Array.isArray(tags) ? tags : [],
        playCount: 0,
        favoriteCount: 0,
        // サーバータイムスタンプはまだ確定していないので現在時刻を使用
        createdAt: nowISOString,
        updatedAt: nowISOString,
        // AudioClip型に合わせてdurationとformattedDurationを追加
        duration,
        formattedDuration,
      };

      // 平坦化した純粋なJSONオブジェクトを返す
      return JSON.parse(JSON.stringify(responseData));
    } catch (createError) {
      console.error("音声クリップの作成に失敗しました:", createError);
      throw new Error(
        await formatErrorMessage(
          "音声クリップの作成に失敗しました",
          createError,
        ),
      );
    }
  } catch (error) {
    console.error("音声クリップの作成中に予期せぬエラーが発生しました:", error);
    throw new Error(
      await formatErrorMessage("音声クリップの作成に失敗しました", error),
    );
  }
}

/**
 * 特定の音声クリップを取得する
 *
 * @param clipId クリップID
 * @returns 音声クリップ
 */
export async function getAudioClip(clipId: string) {
  try {
    if (!clipId) {
      throw new Error("クリップIDが必要です");
    }

    // ヘルパー関数を使用してFirestoreを初期化
    const db = await getFirestoreAdmin();
    console.log("Firestoreの接続に成功しました");

    // クリップの取得
    try {
      const clipDoc = await db.collection("audioClips").doc(clipId).get();

      if (!clipDoc.exists) {
        throw new Error("指定されたクリップが存在しません");
      }

      const data = clipDoc.data();
      if (!data) {
        throw new Error("クリップデータを取得できませんでした");
      }

      // 非公開クリップの場合は作成者のみアクセス可能
      if (!data.isPublic) {
        const currentUser = await getCurrentUser();

        if (!currentUser || currentUser.uid !== data.userId) {
          throw new Error("このクリップにアクセスする権限がありません");
        }
      }

      // 純粋なJSONオブジェクトを作成して返す
      const plainObject = {
        id: clipDoc.id,
        videoId: data.videoId || "",
        title: data.title || "",
        phrase: data.phrase || "",
        description: data.description || "",
        startTime: typeof data.startTime === "number" ? data.startTime : 0,
        endTime: typeof data.endTime === "number" ? data.endTime : 0,
        userId: data.userId || "",
        userName: data.userName || "名無しユーザー",
        userPhotoURL: data.userPhotoURL || null,
        isPublic: !!data.isPublic,
        tags: Array.isArray(data.tags) ? data.tags : [],
        playCount: typeof data.playCount === "number" ? data.playCount : 0,
        favoriteCount:
          typeof data.favoriteCount === "number" ? data.favoriteCount : 0,
        // タイムスタンプを文字列に変換
        createdAt:
          data.createdAt && typeof data.createdAt.toDate === "function"
            ? data.createdAt.toDate().toISOString()
            : new Date().toISOString(),
        updatedAt:
          data.updatedAt && typeof data.updatedAt.toDate === "function"
            ? data.updatedAt.toDate().toISOString()
            : new Date().toISOString(),
        lastPlayedAt:
          data.lastPlayedAt && typeof data.lastPlayedAt.toDate === "function"
            ? data.lastPlayedAt.toDate().toISOString()
            : undefined,
      };

      // プロトタイプを完全に削除して返す
      return JSON.parse(JSON.stringify(plainObject));
    } catch (queryError) {
      console.error("クリップデータの取得に失敗しました:", queryError);
      throw new Error(
        await formatErrorMessage(
          "音声クリップの取得に失敗しました",
          queryError,
        ),
      );
    }
  } catch (error) {
    console.error("音声クリップの取得中に予期せぬエラーが発生しました:", error);
    throw new Error(
      await formatErrorMessage("音声クリップの取得に失敗しました", error),
    );
  }
}

/**
 * 音声クリップを更新する
 *
 * @param clipId クリップID
 * @param data 更新データ
 * @returns 更新結果
 */
export async function updateAudioClip(
  clipId: string,
  data: Partial<AudioClipData>,
) {
  try {
    // 認証チェック
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new Error("認証が必要です");
    }

    // ヘルパー関数を使用してFirestoreを初期化
    const db = await getFirestoreAdmin();

    // クリップの取得
    try {
      const clipDoc = await db.collection("audioClips").doc(clipId).get();

      if (!clipDoc.exists) {
        throw new Error("指定されたクリップが存在しません");
      }

      const clipData = clipDoc.data();

      // 作成者のみ更新可能
      if (clipData && clipData.userId !== currentUser.uid) {
        throw new Error("このクリップを更新する権限がありません");
      }

      const { title, phrase, description, isPublic, tags, startTime, endTime } =
        data;

      // 時間範囲が変更される場合は重複チェック
      if (startTime !== undefined && endTime !== undefined) {
        // 時間の基本バリデーション
        if (
          typeof startTime !== "number" ||
          typeof endTime !== "number" ||
          startTime >= endTime
        ) {
          throw new Error("開始時間は終了時間より前である必要があります");
        }

        // 重複チェック（自分自身のIDを除外）
        const videoId = clipData?.videoId;
        if (!videoId) {
          throw new Error("クリップに関連する動画IDが見つかりません");
        }

        // 重複チェック（自分自身は除外）
        const overlappingClips = await checkTimeRangeOverlapForUpdate(
          db,
          videoId,
          startTime,
          endTime,
          clipId,
        );

        if (overlappingClips.isOverlapping) {
          throw new Error(
            `指定された時間範囲は既存のクリップと重複しています: ${overlappingClips.overlappingClips
              .map((clip) => clip.title)
              .join(", ")}`,
          );
        }
      }

      // 更新データの準備
      const updateData: Record<string, unknown> = {
        updatedAt: FieldValue.serverTimestamp(),
      };

      // 更新可能なフィールドのみ更新
      if (title !== undefined) updateData.title = title;
      if (phrase !== undefined) updateData.phrase = phrase;
      if (description !== undefined) updateData.description = description;
      if (isPublic !== undefined) updateData.isPublic = isPublic;
      if (tags !== undefined) updateData.tags = tags;
      if (startTime !== undefined) updateData.startTime = startTime;
      if (endTime !== undefined) updateData.endTime = endTime;

      // 更新実行
      await db.collection("audioClips").doc(clipId).update(updateData);

      // Pages Routerでは revalidatePath が使用できないため削除

      return {
        id: clipId,
        message: "クリップが更新されました",
      };
    } catch (updateError) {
      console.error("クリップの更新に失敗しました:", updateError);
      throw new Error(
        `音声クリップの更新に失敗しました: ${
          updateError instanceof Error
            ? updateError.message
            : String(updateError)
        }`,
      );
    }
  } catch (error) {
    console.error("音声クリップの更新中に予期せぬエラーが発生しました:", error);
    throw new Error(
      `音声クリップの更新に失敗しました: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

/**
 * 音声クリップを削除する
 *
 * @param clipId クリップID
 * @returns 削除結果
 */
export async function deleteAudioClip(clipId: string) {
  try {
    // 認証チェック
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      throw new Error("認証が必要です");
    }

    // ヘルパー関数を使用してFirestoreを初期化
    const db = await getFirestoreAdmin();

    // クリップの取得
    try {
      const clipDoc = await db.collection("audioClips").doc(clipId).get();

      if (!clipDoc.exists) {
        throw new Error("指定されたクリップが存在しません");
      }

      const clipData = clipDoc.data();

      // 作成者のみ削除可能
      if (clipData && clipData.userId !== currentUser.uid) {
        throw new Error("このクリップを削除する権限がありません");
      }

      const videoId = clipData?.videoId;

      // 削除実行
      await db.collection("audioClips").doc(clipId).delete();

      // Pages Routerでは revalidatePath が使用できないため削除

      return {
        id: clipId,
        message: "クリップが削除されました",
      };
    } catch (deleteError) {
      console.error("クリップの削除に失敗しました:", deleteError);
      throw new Error(
        `音声クリップの削除に失敗しました: ${
          deleteError instanceof Error
            ? deleteError.message
            : String(deleteError)
        }`,
      );
    }
  } catch (error) {
    console.error("音声クリップの削除中に予期せぬエラーが発生しました:", error);
    throw new Error(
      `音声クリップの削除に失敗しました: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

/**
 * 再生回数を更新する
 *
 * @param clipId クリップID
 * @returns 更新結果
 */
export async function incrementPlayCount(clipId: string) {
  try {
    if (!clipId) {
      throw new Error("クリップIDが必要です");
    }

    // ヘルパー関数を使用してFirestoreを初期化
    const db = await getFirestoreAdmin();

    // デバッグ: 認証情報を確認
    const currentUser = await getCurrentUser();
    console.log(
      "incrementPlayCount 認証状態:",
      currentUser ? `認証済み (${currentUser.uid})` : "未認証",
    );

    // クリップの存在確認
    const clipDoc = await db.collection("audioClips").doc(clipId).get();

    if (!clipDoc.exists) {
      throw new Error("指定されたクリップが存在しません");
    }

    // 再生回数をインクリメントし、最終再生日時を更新
    await db
      .collection("audioClips")
      .doc(clipId)
      .update({
        playCount: FieldValue.increment(1),
        lastPlayedAt: FieldValue.serverTimestamp(),
      });

    const responseData = {
      id: clipId,
      message: "再生回数が更新されました",
    };

    // 確実にシリアライズする
    return JSON.parse(JSON.stringify(responseData));
  } catch (error) {
    console.error("再生回数の更新に失敗しました:", error);
    throw new Error(
      await formatErrorMessage("再生回数の更新に失敗しました", error),
    );
  }
}

/**
 * サーバーサイドで音声クリップの時間範囲重複をチェックする
 *
 * @param db Firestoreインスタンス
 * @param videoId 動画ID
 * @param startTime 開始時間（秒）
 * @param endTime 終了時間（秒）
 * @returns 重複チェック結果
 */
async function checkTimeRangeOverlap(
  db: Firestore,
  videoId: string,
  startTime: number,
  endTime: number,
): Promise<{ isOverlapping: boolean; overlappingClips: AudioClipDocument[] }> {
  // デバッグ: 認証情報を確認（改善されたヘルパー関数を使用）
  await checkAndLogAuthInfo("checkTimeRangeOverlap");

  try {
    // 同じ動画の全ての音声クリップを取得
    const clipsSnapshot = await db
      .collection("audioClips")
      .where("videoId", "==", videoId)
      .get();

    if (clipsSnapshot.empty) {
      return { isOverlapping: false, overlappingClips: [] };
    }

    // 重複チェック
    const overlappingClips = clipsSnapshot.docs
      .map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate().toISOString(),
          updatedAt: data.updatedAt?.toDate().toISOString(),
        } as AudioClipDocument;
      })
      .filter((clip) => {
        // 以下の条件で重複と判定
        // 1. 新規範囲が既存範囲に完全に含まれる
        // 2. 新規範囲が既存範囲を完全に含む
        // 3. 新規範囲の開始点が既存範囲内にある
        // 4. 新規範囲の終了点が既存範囲内にある
        return (
          // 1. 新規範囲が既存範囲に完全に含まれる
          (startTime >= clip.startTime && endTime <= clip.endTime) ||
          // 2. 新規範囲が既存範囲を完全に含む
          (startTime <= clip.startTime && endTime >= clip.endTime) ||
          // 3. 新規範囲の開始点が既存範囲内にある
          (startTime >= clip.startTime && startTime < clip.endTime) ||
          // 4. 新規範囲の終了点が既存範囲内にある
          (endTime > clip.startTime && endTime <= clip.endTime)
        );
      });

    return {
      isOverlapping: overlappingClips.length > 0,
      overlappingClips,
    };
  } catch (error) {
    console.error("時間範囲重複チェック中にエラーが発生しました:", error);
    throw new Error(
      await formatErrorMessage("時間範囲重複チェックに失敗しました", error),
    );
  }
}

/**
 * サーバーサイドで音声クリップの時間範囲重複をチェックする（更新用、自分自身を除外）
 *
 * @param db Firestoreインスタンス
 * @param videoId 動画ID
 * @param startTime 開始時間（秒）
 * @param endTime 終了時間（秒）
 * @param excludeClipId 除外するクリップID（自分自身）
 * @returns 重複チェック結果
 */
async function checkTimeRangeOverlapForUpdate(
  db: Firestore,
  videoId: string,
  startTime: number,
  endTime: number,
  excludeClipId: string,
): Promise<{ isOverlapping: boolean; overlappingClips: AudioClipDocument[] }> {
  // 同じ動画の全ての音声クリップを取得
  const clipsSnapshot = await db
    .collection("audioClips")
    .where("videoId", "==", videoId)
    .get();

  if (clipsSnapshot.empty) {
    return { isOverlapping: false, overlappingClips: [] };
  }

  // 重複チェック（自分自身を除外）
  const overlappingClips = clipsSnapshot.docs
    .filter((doc) => doc.id !== excludeClipId) // 自分自身を除外
    .map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate().toISOString(),
        updatedAt: data.updatedAt?.toDate().toISOString(),
      } as AudioClipDocument;
    })
    .filter((clip) => {
      // 以下の条件で重複と判定
      // 1. 新規範囲が既存範囲に完全に含まれる
      // 2. 新規範囲が既存範囲を完全に含む
      // 3. 新規範囲の開始点が既存範囲内にある
      // 4. 新規範囲の終了点が既存範囲内にある
      return (
        // 1. 新規範囲が既存範囲に完全に含まれる
        (startTime >= clip.startTime && endTime <= clip.endTime) ||
        // 2. 新規範囲が既存範囲を完全に含む
        (startTime <= clip.startTime && endTime >= clip.endTime) ||
        // 3. 新規範囲の開始点が既存範囲内にある
        (startTime >= clip.startTime && startTime < clip.endTime) ||
        // 4. 新規範囲の終了点が既存範囲内にある
        (endTime > clip.startTime && endTime <= clip.endTime)
      );
    });

  return {
    isOverlapping: overlappingClips.length > 0,
    overlappingClips,
  };
}

// 音声クリップの取得結果インターフェース
interface AudioClipDocument {
  id: string;
  videoId: string;
  title: string;
  phrase?: string;
  description?: string;
  startTime: number;
  endTime: number;
  userId: string;
  userName: string;
  userPhotoURL: string | null;
  isPublic: boolean;
  tags?: string[];
  playCount: number;
  favoriteCount: number;
  createdAt: string;
  updatedAt: string;
  lastPlayedAt?: string;
}

/**
 * ログインユーザー情報を取得して出力する補助関数
 * エラーのトラブルシューティング用
 */
async function checkAndLogAuthInfo(functionName: string) {
  try {
    const currentUser = await getCurrentUser();
    if (currentUser) {
      console.log(
        `${functionName}: 認証成功 - UID: ${currentUser.uid}, 表示名: ${currentUser.displayName || "名無し"}`,
      );
      return currentUser;
    }
    console.warn(`${functionName}: 未認証状態です`);
    return null;
  } catch (error) {
    console.error(`${functionName}: 認証情報取得エラー:`, error);
    return null;
  }
}
