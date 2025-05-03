import type { Timestamp } from "firebase/firestore";

/**
 * Firestoreから取得した音声クリップデータの型
 */
export interface AudioClipData {
  clipId: string; // クリップID（自動生成）
  videoId: string; // 関連動画ID
  title: string; // クリップタイトル
  phrase: string; // フレーズテキスト
  startTime: number; // 開始時間（秒）
  endTime: number; // 終了時間（秒）
  audioUrl?: string; // 音声ファイルURL（オプション）
  createdAt: Timestamp; // 作成日時
  updatedAt: Timestamp; // 更新日時

  // ユーザー関連情報
  userId: string; // 作成者のユーザーID
  userName: string; // 作成者の表示名
  userPhotoURL?: string; // 作成者のプロフィール画像URL
  isPublic: boolean; // 公開設定（true: 全体公開, false: 作成者のみ）

  // 追加情報
  tags?: string[]; // タグ（検索用）
  playCount: number; // 再生回数
  favoriteCount: number; // お気に入り数
}

/**
 * アプリケーション内で使用する音声クリップの型
 */
export interface AudioClip {
  id: string; // クリップID
  videoId: string; // 関連動画ID
  title: string; // クリップタイトル
  phrase: string; // フレーズテキスト
  startTime: number; // 開始時間（秒）
  endTime: number; // 終了時間（秒）
  audioUrl?: string; // 音声ファイルURL（オプション）
  createdAt: Date; // 作成日時
  updatedAt: Date; // 更新日時

  // ユーザー関連情報
  userId: string; // 作成者のユーザーID
  userName: string; // 作成者の表示名
  userPhotoURL?: string; // 作成者のプロフィール画像URL
  isPublic: boolean; // 公開設定

  // 追加情報
  tags?: string[]; // タグ（検索用）
  playCount: number; // 再生回数
  favoriteCount: number; // お気に入り数

  // UI表示用の追加情報
  duration: number; // 再生時間（秒）
  formattedDuration: string; // フォーマット済み再生時間（例: "0:15"）
}

/**
 * 音声クリップ作成時のデータ型
 */
export interface AudioClipCreateData {
  videoId: string; // 関連動画ID
  title: string; // クリップタイトル
  phrase: string; // フレーズテキスト
  startTime: number; // 開始時間（秒）
  endTime: number; // 終了時間（秒）
  userId: string; // 作成者のユーザーID
  userName: string; // 作成者の表示名
  userPhotoURL?: string; // 作成者のプロフィール画像URL
  isPublic: boolean; // 公開設定
  tags?: string[]; // タグ（検索用）
}

/**
 * 音声クリップ更新時のデータ型
 */
export interface AudioClipUpdateData {
  title?: string; // クリップタイトル
  phrase?: string; // フレーズテキスト
  isPublic?: boolean; // 公開設定
  tags?: string[]; // タグ（検索用）
}

/**
 * お気に入り登録データの型
 */
export interface AudioClipFavorite {
  userId: string; // ユーザーID
  clipId: string; // クリップID
  createdAt: Timestamp; // 登録日時
}

/**
 * 音声クリップ検索パラメータ
 */
export interface AudioClipSearchParams {
  videoId?: string; // 特定の動画のクリップのみ取得
  userId?: string; // 特定のユーザーのクリップのみ取得
  tags?: string[]; // 特定のタグを持つクリップのみ取得
  query?: string; // フレーズやタイトルで検索
  limit: number; // 取得件数
  startAfter?: Date; // ページネーション用
  includePrivate?: boolean; // 非公開クリップも含めるか（自分のクリップ取得時のみtrue）
}

/**
 * 音声クリップ一覧の取得結果
 */
export interface AudioClipListResult {
  clips: AudioClip[]; // クリップ一覧
  hasMore: boolean; // さらにデータがあるか
  lastClip?: AudioClip; // 最後のクリップ（ページネーション用）
}

/**
 * タイムライン上の時間範囲の型
 * 作成済み音声クリップの範囲を表示するために使用
 */
export interface TimeRange {
  start: number; // 開始時間（秒）
  end: number; // 終了時間（秒）
  clipId: string; // 関連するクリップID
  title: string; // クリップのタイトル
  color?: string; // 表示色（オプション）
}

/**
 * 重複チェック結果の型
 */
export interface OverlapCheckResult {
  isOverlapping: boolean; // 重複しているかどうか
  overlappingClips: AudioClip[]; // 重複しているクリップのリスト
}
