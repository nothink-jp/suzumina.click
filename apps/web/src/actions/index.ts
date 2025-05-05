"use server";

/**
 * Server Actions のルートエクスポートファイル
 *
 * このファイルでは、各機能分野のServer Actionsをまとめてエクスポートします。
 * クライアントからのインポートを簡素化するために使用します。
 */

// 認証関連のアクション
export * from "./auth/actions";

// プロフィール関連のアクション
export * from "./profile/actions";

// オーディオクリップ関連のアクション
export * from "./audioclips/actions";

// 動画関連のアクション
export * from "./videos/actions";

// タグ関連のアクション
export * from "./tags/actions";
