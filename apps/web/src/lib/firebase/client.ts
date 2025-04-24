import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

/**
 * Firebaseの設定
 * 環境変数から設定を取得する
 */
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || undefined,
};

/**
 * Firebaseアプリの初期化
 * サーバーサイドレンダリング時にエラーが発生しないようにする
 */
const initializeFirebase = () => {
  // ブラウザ環境でのみ初期化（Window objectがある場合のみ）
  if (typeof window !== "undefined") {
    // すべての必須設定が存在する場合のみ初期化
    const isConfigValid =
      firebaseConfig.apiKey &&
      firebaseConfig.authDomain &&
      firebaseConfig.projectId;

    if (isConfigValid) {
      return !getApps().length ? initializeApp(firebaseConfig) : getApp();
    }

    // 開発環境でのみ警告を表示
    if (process.env.NODE_ENV !== "production") {
      console.warn("Firebase設定に必要な環境変数が不足しています。");
    }
  }

  // サーバーサイド実行時や設定が無効な場合はnullを返す
  return null;
};

// Firebase Appを初期化
const app = initializeFirebase();

// Firebase認証の取得（Appが存在する場合のみ）
const auth = app ? getAuth(app) : null;

// 各インスタンスをエクスポート
export { app, auth };
