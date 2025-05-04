"use server";

import { FieldValue, Timestamp, getFirestore } from "firebase-admin/firestore";
import type {
  DocumentData,
  Firestore,
  Query,
  QueryDocumentSnapshot,
} from "firebase-admin/firestore";
import { revalidatePath } from "next/cache";
import { initializeFirebaseAdmin } from "../api/auth/firebase-admin";
import { getCurrentUser } from "../api/auth/getCurrentUser";

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

    // Firebase Admin SDKを初期化
    try {
      console.log("Firebase Admin SDKの初期化を開始します");
      initializeFirebaseAdmin();
      console.log("Firebase Admin SDKの初期化が完了しました");
    } catch (initError) {
      console.error("Firebase Admin SDKの初期化に失敗しました:", initError);
      throw new Error(
        `サーバー側の認証初期化に失敗しました: ${
          initError instanceof Error ? initError.message : String(initError)
        }`,
      );
    }

    // Firestoreの取得
    let db: Firestore;
    try {
      db = getFirestore();
      console.log("Firestoreの接続に成功しました");
    } catch (dbError) {
      console.error("Firestoreの取得に失敗しました:", dbError);
      throw new Error(
        `データベース接続に失敗しました: ${
          dbError instanceof Error ? dbError.message : String(dbError)
        }`,
      );
    }

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

    // 現在のユーザーを取得
    const currentUser = await getCurrentUser();

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
      const clips = snapshot.docs.map((doc: QueryDocumentSnapshot) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate().toISOString(),
          updatedAt: data.updatedAt?.toDate().toISOString(),
          lastPlayedAt: data.lastPlayedAt
            ? data.lastPlayedAt.toDate().toISOString()
            : undefined,
        };
      });

      // 次のページがあるかどうか
      const hasMore = clips.length === limit;

      return {
        clips,
        hasMore,
        lastClip: clips.length > 0 ? clips[clips.length - 1] : null,
      };
    } catch (queryError) {
      console.error("Firestoreクエリの実行に失敗しました:", queryError);
      throw new Error(
        `音声クリップの取得に失敗しました: ${
          queryError instanceof Error ? queryError.message : String(queryError)
        }`,
      );
    }
  } catch (error) {
    console.error("音声クリップの取得中に予期せぬエラーが発生しました:", error);
    throw new Error(
      `音声クリップの取得に失敗しました: ${
        error instanceof Error ? error.message : String(error)
      }`,
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
    // 認証チェック
    const currentUser = await getCurrentUser();
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

    // Firebase Admin SDKを初期化
    try {
      initializeFirebaseAdmin();
    } catch (initError) {
      console.error("Firebase Admin SDKの初期化に失敗しました:", initError);
      throw new Error(
        `サーバー側の認証初期化に失敗しました: ${
          initError instanceof Error ? initError.message : String(initError)
        }`,
      );
    }

    let db: Firestore;
    try {
      db = getFirestore();
    } catch (dbError) {
      console.error("Firestoreの取得に失敗しました:", dbError);
      throw new Error(
        `データベース接続に失敗しました: ${
          dbError instanceof Error ? dbError.message : String(dbError)
        }`,
      );
    }

    // 動画の存在確認
    try {
      const videoDoc = await db.collection("videos").doc(videoId).get();
      if (!videoDoc.exists) {
        throw new Error("指定された動画が存在しません");
      }
    } catch (videoError) {
      console.error("動画データの取得に失敗しました:", videoError);
      throw new Error(
        `動画データの取得に失敗しました: ${
          videoError instanceof Error ? videoError.message : String(videoError)
        }`,
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
      const clipPath = `/videos/${videoId}`;
      revalidatePath(clipPath);

      // レスポンス用にタイムスタンプをISOString形式に変換
      return {
        id: docRef.id,
        ...newClip,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    } catch (createError) {
      console.error("音声クリップの作成に失敗しました:", createError);
      throw new Error(
        `音声クリップの作成に失敗しました: ${
          createError instanceof Error
            ? createError.message
            : String(createError)
        }`,
      );
    }
  } catch (error) {
    console.error("音声クリップの作成中に予期せぬエラーが発生しました:", error);
    throw new Error(
      `音声クリップの作成に失敗しました: ${
        error instanceof Error ? error.message : String(error)
      }`,
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

    // Firebase Admin SDKを初期化
    try {
      console.log("Firebase Admin SDKの初期化を開始します - getAudioClip");
      initializeFirebaseAdmin();
      console.log("Firebase Admin SDKの初期化が完了しました");
    } catch (initError) {
      console.error("Firebase Admin SDKの初期化に失敗しました:", initError);
      throw new Error(
        `サーバー側の認証初期化に失敗しました: ${
          initError instanceof Error ? initError.message : String(initError)
        }`,
      );
    }

    let db: Firestore;
    try {
      db = getFirestore();
      console.log("Firestoreの接続に成功しました");
    } catch (dbError) {
      console.error("Firestoreの取得に失敗しました:", dbError);
      throw new Error(
        `データベース接続に失敗しました: ${
          dbError instanceof Error ? dbError.message : String(dbError)
        }`,
      );
    }

    // クリップの取得
    try {
      const clipDoc = await db.collection("audioClips").doc(clipId).get();

      if (!clipDoc.exists) {
        throw new Error("指定されたクリップが存在しません");
      }

      const clipData = clipDoc.data();

      // 非公開クリップの場合は作成者のみアクセス可能
      if (clipData && !clipData.isPublic) {
        const currentUser = await getCurrentUser();

        if (!currentUser || currentUser.uid !== clipData.userId) {
          throw new Error("このクリップにアクセスする権限がありません");
        }
      }

      // レスポンス用にタイムスタンプをISOString形式に変換
      return {
        id: clipDoc.id,
        ...clipData,
        createdAt: clipData?.createdAt?.toDate().toISOString(),
        updatedAt: clipData?.updatedAt?.toDate().toISOString(),
        lastPlayedAt: clipData?.lastPlayedAt
          ? clipData.lastPlayedAt.toDate().toISOString()
          : undefined,
      };
    } catch (queryError) {
      console.error("クリップデータの取得に失敗しました:", queryError);
      throw new Error(
        `音声クリップの取得に失敗しました: ${
          queryError instanceof Error ? queryError.message : String(queryError)
        }`,
      );
    }
  } catch (error) {
    console.error("音声クリップの取得中に予期せぬエラーが発生しました:", error);
    throw new Error(
      `音声クリップの取得に失敗しました: ${
        error instanceof Error ? error.message : String(error)
      }`,
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

    // Firebase Admin SDKを初期化
    try {
      initializeFirebaseAdmin();
    } catch (initError) {
      console.error("Firebase Admin SDKの初期化に失敗しました:", initError);
      throw new Error(
        `サーバー側の認証初期化に失敗しました: ${
          initError instanceof Error ? initError.message : String(initError)
        }`,
      );
    }

    let db: Firestore;
    try {
      db = getFirestore();
    } catch (dbError) {
      console.error("Firestoreの取得に失敗しました:", dbError);
      throw new Error(
        `データベース接続に失敗しました: ${
          dbError instanceof Error ? dbError.message : String(dbError)
        }`,
      );
    }

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

      // キャッシュを更新
      if (clipData?.videoId) {
        revalidatePath(`/videos/${clipData.videoId}`);
      }

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

    // Firebase Admin SDKを初期化
    try {
      initializeFirebaseAdmin();
    } catch (initError) {
      console.error("Firebase Admin SDKの初期化に失敗しました:", initError);
      throw new Error(
        `サーバー側の認証初期化に失敗しました: ${
          initError instanceof Error ? initError.message : String(initError)
        }`,
      );
    }

    let db: Firestore;
    try {
      db = getFirestore();
    } catch (dbError) {
      console.error("Firestoreの取得に失敗しました:", dbError);
      throw new Error(
        `データベース接続に失敗しました: ${
          dbError instanceof Error ? dbError.message : String(dbError)
        }`,
      );
    }

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

      // キャッシュを更新
      if (videoId) {
        revalidatePath(`/videos/${videoId}`);
      }

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

    // Firebase Admin SDKを初期化
    initializeFirebaseAdmin();
    const db = getFirestore();

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

    return {
      id: clipId,
      message: "再生回数が更新されました",
    };
  } catch (error) {
    console.error("再生回数の更新に失敗しました:", error);
    throw new Error(
      `再生回数の更新に失敗しました: ${
        error instanceof Error ? error.message : String(error)
      }`,
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
