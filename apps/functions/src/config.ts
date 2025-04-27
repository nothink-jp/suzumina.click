/**
 * 環境変数と設定の管理モジュール
 * 
 * このモジュールは、環境に応じた設定値の取得方法を提供します。
 * ローカル開発環境（エミュレータモード）と本番環境での動作を統一します。
 */

// Firebase Functionsのシークレットを利用するためのインポートを仮定
// 注: 実際の環境に合わせてインポートを調整してください
// import { defineSecret } from "firebase-functions/params";

// シークレットの定義
// const discordClientSecret = defineSecret("DISCORD_CLIENT_SECRET");
// const youtubeApiKey = defineSecret("YOUTUBE_API_KEY");

/**
 * 環境に応じた設定値の取得
 * 
 * エミュレータモードでは環境変数から、本番環境ではSecret Managerから値を取得します。
 * 
 * @param name - 環境変数名
 * @param secretParam - シークレットパラメータ（本番環境用）
 * @returns 設定値（文字列）
 */
// biome-ignore lint/suspicious/noExplicitAny: 将来的なGCP Secret Manager統合のための型定義
export function getSecret(name: string, secretParam?: any): string {
  // エミュレータ環境では環境変数から、本番環境ではSecret Managerから取得
  // 現在はローカル開発向けにprocess.envからのみ取得
  // 本番環境向けにはGCPとの統合後に拡張予定
  return process.env[name] || "";
}

/**
 * Google Cloud Firestoreへの接続設定
 * 
 * @returns Firestoreの接続設定オブジェクト
 */
export function getFirestoreConfig() {
  // エミュレータモードの場合、エミュレータのホストとポートを返す
  if (process.env.FUNCTIONS_EMULATOR === "true") {
    return {
      useEmulator: true,
      host: "localhost",
      port: 8080
    };
  }
  
  // 本番環境では空のオブジェクトを返す（デフォルト接続）
  return {};
}

/**
 * ローカルエミュレータ環境かどうかを判定
 * 
 * @returns エミュレータ環境の場合はtrue
 */
export function isEmulatorMode(): boolean {
  return process.env.FUNCTIONS_EMULATOR === "true";
}