import { Firestore } from "@google-cloud/firestore";

let firestoreInstance: Firestore | null = null;

// Singleton pattern for Firestore instance
export function getFirestore(): Firestore {
  if (!firestoreInstance) {
    // NODE_ENVによる分岐を削除し、常に new Firestore() を呼び出す
    // テスト時には setup.ts でモックされたコンストラクタが使用される
    firestoreInstance = new Firestore();
  }
  return firestoreInstance;
}

// Reset Firestore instance (for testing)
export function resetFirestore(): void {
  firestoreInstance = null;
}

// Export collection reference
export const users = getFirestore().collection("users");
