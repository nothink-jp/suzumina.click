import { Firestore } from "@google-cloud/firestore";

let firestoreInstance: Firestore | null = null;

/**
 * Firestore のシングルトンインスタンスを取得します。
 * インスタンスがまだ作成されていない場合は、新しいインスタンスを作成して返します。
 * テスト環境では、モックされた Firestore コンストラクタが使用されることを想定しています。
 * @returns Firestore のシングルトンインスタンス。
 */
export function getFirestore(): Firestore {
  if (!firestoreInstance) {
    // NODE_ENVによる分岐を削除し、常に new Firestore() を呼び出す
    // テスト時には setup.ts でモックされたコンストラクタが使用される
    firestoreInstance = new Firestore();
  }
  return firestoreInstance;
}

/**
 * Firestore のシングルトンインスタンスをリセットします（テスト用）。
 * これにより、次回の `getFirestore` 呼び出し時に新しいインスタンスが作成されます。
 */
export function resetFirestore(): void {
  firestoreInstance = null;
}

/**
 * Firestore の 'users' コレクションへの参照。
 * `getFirestore` を使用してシングルトンインスタンスを取得し、そのコレクションを参照します。
 */
export const users = getFirestore().collection("users");
