"use server";

/**
 * サーバーサイド用Firebase Admin SDKヘルパー
 *
 * このモジュールは、Server Actions内でのFirebase Admin SDKとFirestoreの
 * 初期化と操作を簡略化するためのヘルパー関数を提供します。
 */

import { initializeFirebaseAdmin } from "@/actions/auth/firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import type { Firestore } from "firebase-admin/firestore";

/**
 * 初期化済みのFirestoreインスタンスを取得する
 *
 * Firebase Admin SDKの初期化とFirestoreインスタンスの取得を一度に行います。
 * エラー処理も行うため、try-catchブロックで囲む必要はありません。
 *
 * @returns 初期化済みのFirestoreインスタンス
 */
export function getFirestoreAdmin(): Firestore {
  try {
    // Firebase Admin SDKを初期化
    initializeFirebaseAdmin();

    // Firestoreインスタンスを取得
    const db = getFirestore();
    return db;
  } catch (error) {
    console.error("Firestoreの取得に失敗しました:", error);
    throw new Error(
      `データベース接続に失敗しました: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

/**
 * Firebase Admin SDKの初期化を行うラッパー関数
 *
 * このラッパー関数は、Firebase Admin SDKの初期化のみを行い、
 * エラーハンドリングを統一化します。
 *
 * @returns 初期化結果（成功の場合はtrue）
 */
export function initializeAdmin(): boolean {
  try {
    initializeFirebaseAdmin();
    return true;
  } catch (error) {
    console.error("Firebase Admin SDKの初期化に失敗しました:", error);
    throw new Error(
      `サーバー側の認証初期化に失敗しました: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}

/**
 * エラーメッセージの作成ヘルパー
 *
 * 一貫したエラーメッセージフォーマットを提供します。
 *
 * @param prefix エラーメッセージの接頭辞
 * @param error エラーオブジェクト
 * @returns フォーマット済みエラーメッセージ
 */
export function formatErrorMessage(prefix: string, error: unknown): string {
  return `${prefix}: ${error instanceof Error ? error.message : String(error)}`;
}
