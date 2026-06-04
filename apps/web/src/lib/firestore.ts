/**
 * Cloud Firestoreへのアクセスを提供するモジュール
 */

import { Firestore } from "@google-cloud/firestore";

// シングルトンパターンで一度だけFirestoreインスタンスを作成
let firestoreInstance: Firestore | null = null;

/**
 * 新しいFirestoreインスタンスを作成
 */
export function createFirestoreInstance(): Firestore {
	// 環境変数からプロジェクトIDを取得、フォールバックとして'suzumina-click'を使用
	const projectId = process.env.GOOGLE_CLOUD_PROJECT || "suzumina-click";

	// 本番ビルドが Emulator に接続するのは致命的な誤設定。明示的に弾く
	// （ローカル開発では FIRESTORE_EMULATOR_HOST が設定され、SDK が自動で Emulator に接続する）
	if (process.env.NODE_ENV === "production" && process.env.FIRESTORE_EMULATOR_HOST) {
		throw new Error(
			"FIRESTORE_EMULATOR_HOST is set in production. Refusing to connect Firestore to an emulator.",
		);
	}

	const instance = new Firestore({
		projectId,
		ignoreUndefinedProperties: true,
	});
	return instance;
}

/**
 * Firestoreクライアントのインスタンスを取得
 */
export function getFirestore(): Firestore {
	if (!firestoreInstance) {
		firestoreInstance = createFirestoreInstance();
	}
	return firestoreInstance;
}
