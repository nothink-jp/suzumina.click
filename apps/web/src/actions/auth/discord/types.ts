/**
 * Discord認証関連の型定義
 */

/**
 * Discord ユーザー情報のインターフェース
 * Discord APIから取得するユーザー情報の構造を定義
 */
export interface DiscordUser {
  /** Discord ユーザーID */
  id: string;
  /** Discord ユーザー名 */
  username: string;
  /** アバター画像のハッシュ値（nullの場合はアバター未設定） */
  avatar: string | null;
  /** ユーザーのメールアドレス（nullの場合は取得不可または未設定） */
  email: string | null;
}

/**
 * Discord ギルド（サーバー）情報のインターフェース
 * Discord APIから取得するギルド情報の構造を定義
 */
export interface DiscordGuild {
  /** Discord ギルドID */
  id: string;
  /** Discord ギルド名 */
  name: string;
}

/**
 * Discord認証コールバック結果のインターフェース
 */
export interface DiscordAuthResult {
  /** 認証処理の成功/失敗 */
  success: boolean;
  /** エラーメッセージ（失敗時のみ） */
  error?: string;
  /** Firebase認証用カスタムトークン（成功時のみ） */
  customToken?: string;
}
