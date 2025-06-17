"use server";

import { firestore, storage } from "@/lib/firestore";
import {
  type ActionResult,
  type AudioFileUploadInfo,
  AudioFileUploadInfoSchema,
  type CreateAudioButtonInput,
  CreateAudioButtonInputSchema,
  type FirestoreAudioButtonData,
} from "@suzumina.click/shared-types";
import {
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  limit as firestoreLimit,
  getDoc,
  getDocs,
  orderBy,
  query,
  startAfter,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes,
} from "firebase/storage";
import { revalidatePath } from "next/cache";

/**
 * 音声ファイルをCloud Storageにアップロード
 */
export async function uploadAudioFile(
  fileData: FormData,
  metadata: AudioFileUploadInfo,
): Promise<ActionResult<{ audioUrl: string; duration: number }>> {
  try {
    // メタデータの検証
    const validatedMetadata = AudioFileUploadInfoSchema.parse(metadata);

    // FormDataから音声ファイルを取得
    const audioFile = fileData.get("audioFile") as File;
    if (!audioFile || !(audioFile instanceof File)) {
      return {
        success: false,
        error: "音声ファイルが見つかりません",
      };
    }

    // ファイルサイズとMIMEタイプの再検証
    if (audioFile.size !== validatedMetadata.fileSize) {
      return {
        success: false,
        error: "ファイルサイズが一致しません",
      };
    }

    if (audioFile.type !== validatedMetadata.mimeType) {
      return {
        success: false,
        error: "ファイル形式が一致しません",
      };
    }

    // 一意なファイル名を生成
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 15);
    const fileExtension = audioFile.name.split(".").pop() || "audio";
    const fileName = `buttons/${timestamp}_${randomId}.${fileExtension}`;

    // Cloud Storageにアップロード
    const storageRef = ref(storage, fileName);
    const uploadResult = await uploadBytes(storageRef, audioFile, {
      contentType: validatedMetadata.mimeType,
      customMetadata: {
        originalName: validatedMetadata.fileName,
        duration: validatedMetadata.duration.toString(),
        uploadedAt: new Date().toISOString(),
      },
    });

    // ダウンロードURLを取得
    const audioUrl = await getDownloadURL(uploadResult.ref);

    return {
      success: true,
      data: {
        audioUrl,
        duration: validatedMetadata.duration,
      },
    };
  } catch (error) {
    console.error("音声ファイルアップロードエラー:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "ファイルアップロードに失敗しました",
    };
  }
}

/**
 * 音声ボタンを作成
 */
export async function createAudioButton(
  input: CreateAudioButtonInput,
  uploadInfo: {
    audioUrl: string;
    duration: number;
    fileSize: number;
    format: string;
  },
): Promise<ActionResult<{ id: string }>> {
  try {
    // 入力データの検証
    const validatedInput = CreateAudioButtonInputSchema.parse(input);

    const now = new Date();
    const audioButtonData: Omit<FirestoreAudioButtonData, "id"> = {
      title: validatedInput.title,
      description: validatedInput.description,
      category: validatedInput.category,
      tags: validatedInput.tags || [],
      audioUrl: uploadInfo.audioUrl,
      duration: uploadInfo.duration,
      fileSize: uploadInfo.fileSize,
      format: uploadInfo.format as "mp3" | "wav" | "m4a" | "ogg",
      sourceVideoId: validatedInput.sourceVideoId,
      startTime: validatedInput.startTime,
      endTime: validatedInput.endTime,
      uploadedBy: undefined, // TODO: ユーザー認証実装後に設定
      isPublic: validatedInput.isPublic,
      playCount: 0,
      likeCount: 0,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    // Firestoreに音声ボタンデータを保存
    const buttonsRef = collection(firestore, "audioButtons");
    const docRef = await addDoc(buttonsRef, {
      ...audioButtonData,
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now),
    });

    // 元動画の音声ボタン数を更新（元動画が指定されている場合）
    if (validatedInput.sourceVideoId) {
      try {
        await updateVideoAudioButtonCount(validatedInput.sourceVideoId);
      } catch (error) {
        console.warn("動画の音声ボタン数更新に失敗:", error);
        // 音声ボタン作成は成功したので、エラーを返さない
      }
    }

    // 関連ページの再検証
    revalidatePath("/buttons");
    if (validatedInput.sourceVideoId) {
      revalidatePath(`/videos/${validatedInput.sourceVideoId}`);
    }

    return {
      success: true,
      data: { id: docRef.id },
    };
  } catch (error) {
    console.error("音声ボタン作成エラー:", error);

    // アップロード済みのファイルを削除
    if (uploadInfo.audioUrl) {
      try {
        const fileRef = ref(storage, uploadInfo.audioUrl);
        await deleteObject(fileRef);
      } catch (deleteError) {
        console.error("音声ファイル削除エラー:", deleteError);
      }
    }

    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "音声ボタンの作成に失敗しました",
    };
  }
}

/**
 * 動画の音声ボタン数を更新
 */
async function updateVideoAudioButtonCount(videoId: string): Promise<void> {
  try {
    // 指定された動画の音声ボタン数をカウント
    const buttonsQuery = query(
      collection(firestore, "audioButtons"),
      where("sourceVideoId", "==", videoId),
      where("isPublic", "==", true),
    );
    const buttonsSnapshot = await getDocs(buttonsQuery);
    const audioButtonCount = buttonsSnapshot.size;

    // videosコレクションで動画ドキュメントを更新
    const videoDocRef = doc(firestore, "videos", videoId);
    await updateDoc(videoDocRef, {
      audioButtonCount,
      hasAudioButtons: audioButtonCount > 0,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error("動画の音声ボタン数更新エラー:", error);
    throw error;
  }
}

/**
 * 音声ボタンを削除
 */
export async function deleteAudioButton(
  id: string,
): Promise<ActionResult<void>> {
  try {
    // 音声ボタンデータを取得
    const buttonDocRef = doc(firestore, "audioButtons", id);
    const buttonDoc = await getDoc(buttonDocRef);

    if (!buttonDoc.exists()) {
      return {
        success: false,
        error: "音声ボタンが見つかりません",
      };
    }

    const buttonData = buttonDoc.data() as FirestoreAudioButtonData;

    // バッチ処理で削除
    const batch = writeBatch(firestore);

    // Firestoreドキュメントを削除
    batch.delete(buttonDocRef);

    await batch.commit();

    // Cloud Storageから音声ファイルを削除
    try {
      const fileRef = ref(storage, buttonData.audioUrl);
      await deleteObject(fileRef);
    } catch (storageError) {
      console.warn("音声ファイル削除エラー:", storageError);
      // ストレージファイルの削除に失敗しても処理を続行
    }

    // 元動画の音声ボタン数を更新
    if (buttonData.sourceVideoId) {
      try {
        await updateVideoAudioButtonCount(buttonData.sourceVideoId);
      } catch (error) {
        console.warn("動画の音声ボタン数更新に失敗:", error);
      }
    }

    // 関連ページの再検証
    revalidatePath("/buttons");
    if (buttonData.sourceVideoId) {
      revalidatePath(`/videos/${buttonData.sourceVideoId}`);
    }

    return { success: true };
  } catch (error) {
    console.error("音声ボタン削除エラー:", error);
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "音声ボタンの削除に失敗しました",
    };
  }
}

/**
 * 音声ボタンの再生回数を増加
 */
export async function incrementPlayCount(
  id: string,
): Promise<ActionResult<void>> {
  try {
    const buttonDocRef = doc(firestore, "audioButtons", id);
    await updateDoc(buttonDocRef, {
      playCount: (await getDoc(buttonDocRef)).data()?.playCount + 1 || 1,
      updatedAt: Timestamp.now(),
    });

    return { success: true };
  } catch (error) {
    console.error("再生回数更新エラー:", error);
    return {
      success: false,
      error: "再生回数の更新に失敗しました",
    };
  }
}

/**
 * 音声ボタンのいいね数を増加
 */
export async function incrementLikeCount(
  id: string,
): Promise<ActionResult<void>> {
  try {
    const buttonDocRef = doc(firestore, "audioButtons", id);
    await updateDoc(buttonDocRef, {
      likeCount: (await getDoc(buttonDocRef)).data()?.likeCount + 1 || 1,
      updatedAt: Timestamp.now(),
    });

    return { success: true };
  } catch (error) {
    console.error("いいね数更新エラー:", error);
    return {
      success: false,
      error: "いいね数の更新に失敗しました",
    };
  }
}
