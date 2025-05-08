import { getApp, getApps, initializeApp } from "firebase/app";
import { type Auth, connectAuthEmulator, getAuth } from "firebase/auth";
// Firestoreのインポートを削除

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
 * 設定の有効性を確認
 */
const isFirebaseConfigValid = () => {
  const requiredConfig = [
    firebaseConfig.apiKey,
    firebaseConfig.authDomain,
    firebaseConfig.projectId,
  ];
  return requiredConfig.every((config) => !!config);
};

/**
 * Firebaseアプリの初期化
 * サーバーサイドレンダリング時にエラーが発生しないようにする
 */
const initializeFirebase = () => {
  // ブラウザ環境でのみ初期化（Window objectがある場合のみ）
  if (typeof window !== "undefined") {
    try {
      // すべての必須設定が存在する場合のみ初期化
      if (isFirebaseConfigValid()) {
        return getApps().length ? getApp() : initializeApp(firebaseConfig);
      }

      // 設定が不足している場合は警告を表示
      console.warn(
        "Firebase設定に必要な環境変数が不足しています。必須環境変数: NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, NEXT_PUBLIC_FIREBASE_PROJECT_ID",
      );
    } catch (error) {
      console.error("Firebase初期化エラー:", error);
    }
  }

  // サーバーサイド実行時や設定が無効な場合はnullを返す
  return null;
};

/**
 * Firebase認証の初期化
 * 複数回呼び出されても一度だけ初期化される
 */
let authInstance: Auth | null = null;

const getAuthInstance = (): Auth | null => {
  if (typeof window === "undefined") {
    // サーバーサイドではnullを返す
    return null;
  }

  try {
    if (!authInstance) {
      const app = initializeFirebase();

      if (app) {
        authInstance = getAuth(app);
        console.log("Firebase認証が初期化されました");

        // 開発環境でエミュレータに接続
        if (
          process.env.NODE_ENV === "development" &&
          process.env.NEXT_PUBLIC_USE_EMULATOR === "true"
        ) {
          connectAuthEmulator(authInstance, "http://localhost:9099", {
            disableWarnings: false,
          });
          console.log("Firebase Auth Emulatorに接続しました");

          // Firestoreエミュレータへの接続を削除
        }
      }
    }
    return authInstance;
  } catch (error) {
    console.error("Firebase認証の初期化に失敗しました:", error);
    return null;
  }
};

// Firebase Appを初期化
const app = initializeFirebase();

// Firebase認証の取得
const auth = getAuthInstance();

// ダミーのdbオブジェクトを提供
// 注意: このオブジェクトは実際には何もしません。
// クライアントコンポーネントは直接Firestoreにアクセスせず、Server Actionsを使用してください。
// これは依存関係のビルドエラーを防ぐための一時的な対応です。
const db = {};

// 各インスタンスをエクスポート
export { app, auth, db, getAuthInstance };
