import { getAudioClipsByVideo } from "./api";
import type {
  AudioClip,
  AudioClipSearchParams,
  OverlapCheckResult,
  TimeRange,
} from "./types";

/**
 * 音声クリップの時間範囲が既存のクリップと重複するかチェックする関数
 *
 * @param videoId 動画ID
 * @param startTime 開始時間（秒）
 * @param endTime 終了時間（秒）
 * @param excludeClipId 除外するクリップID（更新時に自分自身を除外）
 * @returns 重複チェック結果
 */
export async function checkTimeRangeOverlap(
  videoId: string,
  startTime: number,
  endTime: number,
  excludeClipId?: string,
): Promise<OverlapCheckResult> {
  // 同じ動画の全ての音声クリップを取得
  const existingClips = await getAudioClipsByVideo({
    videoId,
    limit: 1000, // 十分大きな数を指定して全てのクリップを取得
    includePrivate: true, // 非公開クリップも含める
  });

  // 重複チェック
  const overlappingClips = existingClips.clips.filter((clip) => {
    // 更新時は自分自身を除外
    if (excludeClipId && clip.id === excludeClipId) {
      return false;
    }

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
 * 指定された動画の全ての音声クリップの時間範囲を取得する関数
 *
 * @param videoId 動画ID
 * @returns 時間範囲の配列
 */
export async function getVideoTimeRanges(
  videoId: string,
): Promise<TimeRange[]> {
  // 同じ動画の全ての音声クリップを取得
  const clipList = await getAudioClipsByVideo({
    videoId,
    limit: 1000,
    includePrivate: true, // 非公開クリップも含める
  });

  // TimeRange形式に変換
  return clipList.clips.map((clip) => ({
    start: clip.startTime,
    end: clip.endTime,
    clipId: clip.id,
    title: clip.title,
  }));
}

/**
 * 時間をフォーマットする関数（mm:ss形式）
 *
 * @param seconds 秒数
 * @returns フォーマットされた時間文字列
 */
export function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}
