import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
// 必要に応じて他の Firebase サービス (Firestore, Storage など) をインポート
// import { getFirestore } from "firebase/firestore";
// import { getStorage } from "firebase/storage";

// Firebase プロジェクトの設定 (環境変数から取得)
// これらの変数は .env.local などに定義し、
// Next.js の環境変数として読み込めるように設定する必要があります (next.config.js など)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  // measurementId はオプション
  // measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Firebase App を初期化 (既に初期化されていれば既存の App を取得)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Firebase Authentication インスタンスを取得
const auth = getAuth(app);

// 他の Firebase サービスインスタンスを取得 (必要に応じて)
// const db = getFirestore(app);
// const storage = getStorage(app);

// 各インスタンスをエクスポート
export { app, auth /*, db, storage */ };

// 注意: 環境変数の設定が必要です。
// 1. プロジェクトルートに `.env.local` ファイルを作成します。
// 2. Firebase Console のプロジェクト設定 > 全般 > マイアプリ で
//    ウェブアプリの設定情報を確認し、対応する NEXT_PUBLIC_FIREBASE_... 変数を `.env.local` に記述します。
//    例:
//    NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
//    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
//    ...
// 3. `.env.local` は `.gitignore` に含まれていることを確認してください (通常デフォルトで含まれます)。
