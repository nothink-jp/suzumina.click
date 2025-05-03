import {
  type DocumentSnapshot,
  type QueryDocumentSnapshot,
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  startAfter,
  updateDoc,
  where,
} from "firebase/firestore";
import { getFirestore } from "firebase/firestore";
import { app } from "../firebase/client";
import type {
  AudioClip,
  AudioClipCreateData,
  AudioClipData,
  AudioClipListResult,
  AudioClipSearchParams,
  AudioClipUpdateData,
} from "./types";

// Firestoreインスタンスの取得
const db = app ? getFirestore(app) : null;

// Firestoreインスタンスが存在するか確認する関数
function ensureDb() {
  if (!db) {
    throw new Error("Firestoreが初期化されていません");
  }
  return db;
}

/**
 * 音声クリップデータをアプリケーション用の形式に変換
 *
 * @param data Firestoreから取得した音声クリップデータ
 * @returns アプリケーション用に変換された音声クリップデータ
 */
export function convertAudioClipData(data: AudioClipData): AudioClip {
  // 再生時間の計算
  const duration = data.endTime - data.startTime;
  const minutes = Math.floor(duration / 60);
  const seconds = Math.floor(duration % 60);
  const formattedDuration = `${minutes}:${seconds.toString().padStart(2, "0")}`;

  return {
    id: data.clipId,
    videoId: data.videoId,
    title: data.title,
    phrase: data.phrase,
    startTime: data.startTime,
    endTime: data.endTime,
    audioUrl: data.audioUrl,
    createdAt: data.createdAt.toDate(),
    updatedAt: data.updatedAt.toDate(),
    userId: data.userId,
    userName: data.userName,
    userPhotoURL: data.userPhotoURL,
    isPublic: data.isPublic,
    tags: data.tags || [],
    playCount: data.playCount,
    favoriteCount: data.favoriteCount,
    lastPlayedAt: data.lastPlayedAt ? data.lastPlayedAt.toDate() : undefined,
    duration,
    formattedDuration,
  };
}

/**
 * 特定の動画の音声クリップを取得
 *
 * @param params 検索パラメータ
 * @returns 音声クリップ一覧の取得結果
 */
export async function getAudioClipsByVideo(
  params: AudioClipSearchParams,
): Promise<AudioClipListResult> {
  try {
    if (!params.videoId) {
      throw new Error("videoIdは必須です");
    }

    const db = ensureDb();
    const clipsRef = collection(db, "audioClips");

    // クエリ条件の構築
    let q = query(
      clipsRef,
      where("videoId", "==", params.videoId),
      orderBy("createdAt", "desc"),
      limit(params.limit),
    );

    // 非公開クリップを含めない場合（デフォルト）
    if (!params.includePrivate) {
      q = query(q, where("isPublic", "==", true));
    }

    // ページネーション
    if (params.startAfter) {
      const startAfterTimestamp = Timestamp.fromDate(params.startAfter);
      q = query(q, startAfter(startAfterTimestamp));
    }
    const querySnapshot = await getDocs(q);
    const clips: AudioClip[] = [];

    for (const docSnapshot of querySnapshot.docs) {
      const data = {
        ...docSnapshot.data(),
        clipId: docSnapshot.id,
      } as AudioClipData;
      clips.push(convertAudioClipData(data));
    }

    return {
      clips,
      hasMore: clips.length === params.limit,
      lastClip: clips.length > 0 ? clips[clips.length - 1] : undefined,
    };
  } catch (error) {
    console.error("音声クリップの取得に失敗しました:", error);
    throw error;
  }
}

/**
 * 特定のユーザーの音声クリップを取得
 *
 * @param params 検索パラメータ
 * @returns 音声クリップ一覧の取得結果
 */
export async function getAudioClipsByUser(
  params: AudioClipSearchParams,
): Promise<AudioClipListResult> {
  try {
    if (!params.userId) {
      throw new Error("userIdは必須です");
    }

    const db = ensureDb();
    const clipsRef = collection(db, "audioClips");

    // クエリ条件の構築
    let q = query(
      clipsRef,
      where("userId", "==", params.userId),
      orderBy("createdAt", "desc"),
      limit(params.limit),
    );

    // 非公開クリップを含める場合（自分のクリップ取得時）
    if (!params.includePrivate) {
      q = query(q, where("isPublic", "==", true));
    }

    // ページネーション
    if (params.startAfter) {
      const startAfterTimestamp = Timestamp.fromDate(params.startAfter);
      q = query(q, startAfter(startAfterTimestamp));
    }
    const querySnapshot = await getDocs(q);
    const clips: AudioClip[] = [];

    for (const docSnapshot of querySnapshot.docs) {
      const data = {
        ...docSnapshot.data(),
        clipId: docSnapshot.id,
      } as AudioClipData;
      clips.push(convertAudioClipData(data));
    }

    return {
      clips,
      hasMore: clips.length === params.limit,
      lastClip: clips.length > 0 ? clips[clips.length - 1] : undefined,
    };
  } catch (error) {
    console.error("音声クリップの取得に失敗しました:", error);
    throw error;
  }
}

/**
 * 特定の音声クリップを取得
 *
 * @param clipId クリップID
 * @returns 音声クリップデータ、存在しない場合はnull
 */
export async function getAudioClipById(
  clipId: string,
): Promise<AudioClip | null> {
  try {
    const db = ensureDb();
    const clipRef = doc(db, "audioClips", clipId);
    const clipSnapshot = await getDoc(clipRef);

    if (!clipSnapshot.exists()) {
      return null;
    }

    const data = {
      ...clipSnapshot.data(),
      clipId: clipSnapshot.id,
    } as AudioClipData;
    return convertAudioClipData(data);
  } catch (error) {
    console.error("音声クリップの取得に失敗しました:", error);
    throw error;
  }
}

/**
 * 音声クリップを作成
 *
 * @param data 作成するクリップデータ
 * @returns 作成された音声クリップデータ
 */
export async function createAudioClip(
  data: AudioClipCreateData,
): Promise<AudioClip> {
  try {
    const db = ensureDb();
    const clipsRef = collection(db, "audioClips");

    const newClipData: Omit<AudioClipData, "clipId"> = {
      ...data,
      phrase: data.phrase || "",
      tags: data.tags || [],
      playCount: 0,
      favoriteCount: 0,
      createdAt: serverTimestamp() as Timestamp,
      updatedAt: serverTimestamp() as Timestamp,
    };

    const docRef = await addDoc(clipsRef, newClipData);

    // IDを含めた完全なデータを取得
    const clipSnapshot = await getDoc(docRef);
    if (!clipSnapshot.exists()) {
      throw new Error("クリップの作成に失敗しました");
    }

    const clipData = {
      ...clipSnapshot.data(),
      clipId: docRef.id,
    } as AudioClipData;

    return convertAudioClipData(clipData);
  } catch (error) {
    console.error("音声クリップの作成に失敗しました:", error);
    throw error;
  }
}

/**
 * 音声クリップを更新
 *
 * @param clipId クリップID
 * @param data 更新するデータ
 */
export async function updateAudioClip(
  clipId: string,
  data: AudioClipUpdateData,
): Promise<void> {
  try {
    const db = ensureDb();
    const clipRef = doc(db, "audioClips", clipId);

    await updateDoc(clipRef, {
      ...data,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("音声クリップの更新に失敗しました:", error);
    throw error;
  }
}

/**
 * 音声クリップを削除
 *
 * @param clipId クリップID
 */
export async function deleteAudioClip(clipId: string): Promise<void> {
  try {
    const db = ensureDb();
    const clipRef = doc(db, "audioClips", clipId);
    await deleteDoc(clipRef);
  } catch (error) {
    console.error("音声クリップの削除に失敗しました:", error);
    throw error;
  }
}

/**
 * 音声クリップの再生回数をインクリメント
 *
 * @param clipId クリップID
 */
export async function incrementPlayCount(clipId: string): Promise<void> {
  try {
    const db = ensureDb();
    const clipRef = doc(db, "audioClips", clipId);
    await updateDoc(clipRef, {
      playCount: increment(1),
    });
  } catch (error) {
    console.error("再生回数の更新に失敗しました:", error);
    throw error;
  }
}

/**
 * お気に入り登録状態を確認
 *
 * @param clipId クリップID
 * @param userId ユーザーID
 * @returns お気に入り登録されているかどうか
 */
export async function checkFavoriteStatus(
  clipId: string,
  userId: string,
): Promise<boolean> {
  try {
    const db = ensureDb();
    const favoriteId = `${userId}_${clipId}`;
    const favoriteRef = doc(db, "audioClipFavorites", favoriteId);
    const favoriteSnapshot = await getDoc(favoriteRef);

    return favoriteSnapshot.exists();
  } catch (error) {
    console.error("お気に入り状態の確認に失敗しました:", error);
    throw error;
  }
}

/**
 * お気に入り登録/解除
 *
 * @param clipId クリップID
 * @param userId ユーザーID
 * @param isFavorite お気に入り登録する場合はtrue、解除する場合はfalse
 */
export async function toggleFavorite(
  clipId: string,
  userId: string,
  isFavorite: boolean,
): Promise<void> {
  try {
    const db = ensureDb();
    const favoriteId = `${userId}_${clipId}`;
    const favoriteRef = doc(db, "audioClipFavorites", favoriteId);
    const clipRef = doc(db, "audioClips", clipId);

    if (isFavorite) {
      // お気に入り登録
      await updateDoc(clipRef, {
        favoriteCount: increment(1),
      });

      await setDoc(favoriteRef, {
        userId,
        clipId,
        createdAt: serverTimestamp(),
      });
    } else {
      // お気に入り解除
      await updateDoc(clipRef, {
        favoriteCount: increment(-1),
      });

      await deleteDoc(favoriteRef);
    }
  } catch (error) {
    console.error("お気に入り操作に失敗しました:", error);
    throw error;
  }
}

/**
 * ユーザーのお気に入りクリップ一覧を取得
 *
 * @param userId ユーザーID
 * @param params 検索パラメータ
 * @returns 音声クリップ一覧の取得結果
 */
export async function getFavoriteClips(
  userId: string,
  params: Omit<AudioClipSearchParams, "userId"> & {
    cursor?: Date | DocumentSnapshot | QueryDocumentSnapshot;
  },
): Promise<AudioClipListResult> {
  try {
    const db = ensureDb();
    // まずお気に入りのIDを取得
    const favoritesRef = collection(db, "audioClipFavorites");
    let favoritesQuery = query(
      favoritesRef,
      where("userId", "==", userId),
      orderBy("createdAt", "desc"),
      limit(params.limit),
    );

    // ページネーション
    if (params.cursor) {
      // 直接ドキュメントが渡された場合はそれを使用
      if ("data" in params.cursor) {
        favoritesQuery = query(favoritesQuery, startAfter(params.cursor));
      } else if (params.cursor instanceof Date) {
        // Dateの場合はTimestampに変換
        const startAfterTimestamp = Timestamp.fromDate(params.cursor);
        favoritesQuery = query(favoritesQuery, startAfter(startAfterTimestamp));
      }
    }

    const favoritesSnapshot = await getDocs(favoritesQuery);
    const clipIds: string[] = [];

    for (const docSnapshot of favoritesSnapshot.docs) {
      const data = docSnapshot.data();
      clipIds.push(data.clipId);
    }

    if (clipIds.length === 0) {
      return {
        clips: [],
        hasMore: false,
      };
    }

    // クリップIDを使って実際のクリップデータを取得
    const clips: AudioClip[] = [];

    // Firestoreは「in」クエリで最大10個までしか指定できないため、
    // 必要に応じてバッチ処理する
    const batchSize = 10;
    for (let i = 0; i < clipIds.length; i += batchSize) {
      const batch = clipIds.slice(i, i + batchSize);

      const clipsRef = collection(db, "audioClips");
      const clipsQuery = query(clipsRef, where("__name__", "in", batch));

      const clipsSnapshot = await getDocs(clipsQuery);

      for (const docSnapshot of clipsSnapshot.docs) {
        const data = {
          ...docSnapshot.data(),
          clipId: docSnapshot.id,
        } as AudioClipData;
        clips.push(convertAudioClipData(data));
      }
    }

    return {
      clips,
      hasMore: clipIds.length === params.limit,
      lastClip: clips.length > 0 ? clips[clips.length - 1] : undefined,
    };
  } catch (error) {
    console.error("お気に入りクリップの取得に失敗しました:", error);
    throw error;
  }
}
