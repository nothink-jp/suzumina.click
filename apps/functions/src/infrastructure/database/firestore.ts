/**
 * Cloud Firestoreへのアクセスを提供するモジュール
 *
 * firebase-adminからの依存を排除し、直接@google-cloud/firestoreを使用します。
 * Cloud Run Functions環境での軽量化を実現します。
 */

import { FieldValue, Firestore, Timestamp } from "@google-cloud/firestore";
import * as logger from "../../shared/logger";

// シングルトンパターンで一度だけFirestoreインスタンスを作成
let firestoreInstance: Firestore | null = null;

/**
 * 新しいFirestoreインスタンスを作成
 *
 * @returns 新しく作成されたFirestoreインスタンス
 */
export function createFirestoreInstance(): Firestore {
	// テスト環境での本番Firestore接続を防ぐ
	if (process.env.NODE_ENV === "test" && !process.env.ALLOW_TEST_FIRESTORE) {
		logger.warn(
			"Test environment detected. Firestore connection attempt blocked. " +
				"This should not happen if mocks are properly configured.",
		);
		throw new Error(
			"Test environment detected. Firestore connection is disabled to prevent test data contamination. " +
				"Use mocked Firestore in tests or set ALLOW_TEST_FIRESTORE=true if you really need to connect.",
		);
	}

	const instance = new Firestore({
		// undefined値を無視するオプションを有効化
		ignoreUndefinedProperties: true,
	});
	logger.info("Firestoreクライアントが初期化されました", {
		environment: process.env.NODE_ENV,
		projectId: process.env.GOOGLE_CLOUD_PROJECT || "default",
	});
	return instance;
}

/**
 * Firestoreクライアントのインスタンスを取得
 *
 * @returns Firestoreクライアントのインスタンス
 */
export function getFirestore(): Firestore {
	if (!firestoreInstance) {
		firestoreInstance = createFirestoreInstance();
	}
	return firestoreInstance;
}

/**
 * テスト用にFirestoreインスタンスをリセット
 * テストでのみ使用し、本番コードでは使用しないでください
 */
export function resetFirestoreInstance(): void {
	firestoreInstance = null;
}

// エクスポート用にFirestore、FieldValue、Timestampを再エクスポート
// これにより、他のモジュールでのインポートを簡素化
export { FieldValue, Firestore, Timestamp };

// デフォルトエクスポートとしてgetFirestore関数を提供
// 注意: インスタンスではなく関数をエクスポートすることで、
// モックが適切に機能するようにする
const firestore = {
	get collection() {
		return getFirestore().collection.bind(getFirestore());
	},
	get collectionGroup() {
		return getFirestore().collectionGroup.bind(getFirestore());
	},
	get batch() {
		return getFirestore().batch.bind(getFirestore());
	},
	get runTransaction() {
		return getFirestore().runTransaction.bind(getFirestore());
	},
};

export default firestore;
