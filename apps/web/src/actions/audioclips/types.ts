/**
 * オーディオクリップのServer Actionsで使用する共通型定義
 */

import type { AudioClip } from "../../lib/audioclips/types";

/**
 * クリップ一覧取得時のパラメータ型
 */
export interface AudioClipsFetchParams {
  videoId?: string | null;
  userId?: string | null;
  limit?: number;
  startAfter?: Date | null;
}

/**
 * クリップ一覧取得結果の型
 */
export interface FetchResult {
  clips: AudioClip[];
  hasMore: boolean;
  lastClip: AudioClip | null;
}
