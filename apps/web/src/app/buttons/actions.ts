"use server";

import { getFirestore } from "@/lib/firestore";
import { Timestamp } from "@google-cloud/firestore";
import {
  type ActionResult,
  type AudioFileUploadInfo,
  AudioFileUploadInfoSchema,
  type CreateAudioButtonInput,
  CreateAudioButtonInputSchema,
  type FirestoreAudioButtonData,
} from "@suzumina.click/shared-types";
import { revalidatePath } from "next/cache";

/**
 * 音声ファイルをアップロード（Phase 2で実装予定）
 * 現在はメタデータのみ保存
 */
export async function uploadAudioFile(
  fileData: FormData,
  metadata: AudioFileUploadInfo,
): Promise<ActionResult<{ audioUrl: string; duration: number }>> {
  try {
    // メタデータの検証
    const validatedMetadata = AudioFileUploadInfoSchema.parse(metadata);

    // Phase 1では仮のURLを返す（実際のファイルアップロードはPhase 2で実装）
    const mockAudioUrl = `https://example.com/audio/${Date.now()}.${validatedMetadata.mimeType.split("/")[1]}`;

    return {
      success: true,
      data: {
        audioUrl: mockAudioUrl,
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

    const firestore = getFirestore();
    const now = new Date();

    const audioButtonData = {
      title: validatedInput.title,
      description: validatedInput.description || "",
      category: validatedInput.category,
      tags: validatedInput.tags || [],
      audioUrl: uploadInfo.audioUrl,
      duration: uploadInfo.duration,
      fileSize: uploadInfo.fileSize,
      format: uploadInfo.format,
      sourceVideoId: validatedInput.sourceVideoId,
      sourceVideoTitle: "", // TODO: 元動画タイトル取得
      startTime: validatedInput.startTime,
      endTime: validatedInput.endTime,
      uploadedBy: undefined, // TODO: ユーザー認証実装後に設定
      isPublic: validatedInput.isPublic,
      playCount: 0,
      likeCount: 0,
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now),
    };

    // Firestoreに音声ボタンデータを保存
    const docRef = await firestore
      .collection("audioButtons")
      .add(audioButtonData);

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
    const firestore = getFirestore();

    // 指定された動画の音声ボタン数をカウント
    const buttonsSnapshot = await firestore
      .collection("audioButtons")
      .where("sourceVideoId", "==", videoId)
      .where("isPublic", "==", true)
      .get();

    const audioButtonCount = buttonsSnapshot.size;

    // videosコレクションで動画ドキュメントを更新
    await firestore
      .collection("videos")
      .doc(videoId)
      .update({
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
    const firestore = getFirestore();

    // 音声ボタンデータを取得
    const buttonDoc = await firestore.collection("audioButtons").doc(id).get();

    if (!buttonDoc.exists) {
      return {
        success: false,
        error: "音声ボタンが見つかりません",
      };
    }

    const buttonData = buttonDoc.data();

    // Firestoreドキュメントを削除
    await firestore.collection("audioButtons").doc(id).delete();

    // 元動画の音声ボタン数を更新
    if (buttonData?.sourceVideoId) {
      try {
        await updateVideoAudioButtonCount(buttonData.sourceVideoId);
      } catch (error) {
        console.warn("動画の音声ボタン数更新に失敗:", error);
      }
    }

    // 関連ページの再検証
    revalidatePath("/buttons");
    if (buttonData?.sourceVideoId) {
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
    const firestore = getFirestore();

    // 現在のデータを取得
    const buttonDoc = await firestore.collection("audioButtons").doc(id).get();

    if (!buttonDoc.exists) {
      return {
        success: false,
        error: "音声ボタンが見つかりません",
      };
    }

    const currentData = buttonDoc.data();
    const currentPlayCount = currentData?.playCount || 0;

    // 再生回数を増加
    await firestore
      .collection("audioButtons")
      .doc(id)
      .update({
        playCount: currentPlayCount + 1,
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
    const firestore = getFirestore();

    // 現在のデータを取得
    const buttonDoc = await firestore.collection("audioButtons").doc(id).get();

    if (!buttonDoc.exists) {
      return {
        success: false,
        error: "音声ボタンが見つかりません",
      };
    }

    const currentData = buttonDoc.data();
    const currentLikeCount = currentData?.likeCount || 0;

    // いいね数を増加
    await firestore
      .collection("audioButtons")
      .doc(id)
      .update({
        likeCount: currentLikeCount + 1,
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
