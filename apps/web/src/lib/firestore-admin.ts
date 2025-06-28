/**
 * Cloud Firestore Admin SDK access for Server Actions
 */

import { FieldValue, type Firestore, type Transaction } from "@google-cloud/firestore";
import { getFirestore } from "./firestore";

/**
 * Firestore Admin wrapper class for Server Actions
 */
export class FirestoreAdmin {
	private static instance: FirestoreAdmin | null = null;
	private firestore: Firestore;

	private constructor() {
		this.firestore = getFirestore();
	}

	/**
	 * シングルトンインスタンスを取得
	 */
	public static getInstance(): FirestoreAdmin {
		if (!FirestoreAdmin.instance) {
			FirestoreAdmin.instance = new FirestoreAdmin();
		}
		return FirestoreAdmin.instance;
	}

	/**
	 * Firestoreインスタンスを取得
	 */
	public get db(): Firestore {
		return this.firestore;
	}

	/**
	 * コレクション参照を取得
	 */
	public collection(path: string) {
		return this.firestore.collection(path);
	}

	/**
	 * コレクショングループクエリを取得
	 */
	public collectionGroup(collectionId: string) {
		return this.firestore.collectionGroup(collectionId);
	}

	/**
	 * ドキュメント参照を取得
	 */
	public doc(path: string) {
		return this.firestore.doc(path);
	}

	/**
	 * FieldValue utilities
	 */
	public get FieldValue() {
		return FieldValue;
	}

	/**
	 * バッチ操作用のインスタンスを取得
	 */
	public batch() {
		return this.firestore.batch();
	}

	/**
	 * トランザクション実行
	 */
	public async runTransaction<T>(
		updateFunction: (transaction: Transaction) => Promise<T>,
	): Promise<T> {
		return await this.firestore.runTransaction(updateFunction);
	}
}
