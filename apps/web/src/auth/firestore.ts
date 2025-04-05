import { Firestore } from "@google-cloud/firestore";
import { getMockState } from "../../tests/mocks/firestore";
import type { MockFirestoreData } from "../../tests/mocks/firestore";

let firestoreInstance: Firestore | null = null;

// Singleton pattern for Firestore instance
export function getFirestore(): Firestore {
  if (!firestoreInstance) {
    if (process.env.NODE_ENV === "test") {
      // テスト環境用のダミーインスタンス
      firestoreInstance = {
        collection: () => ({
          doc: () => ({
            get: async () => {
              const state = getMockState();
              console.log("Mock Firestore get returning:", state);
              return {
                exists: state.exists,
                data: () => (state.exists ? state.data : undefined),
              };
            },
            set: async (data: Partial<MockFirestoreData>) => {
              console.log("Mock Firestore set called with:", data);
            },
            update: async (data: Partial<MockFirestoreData>) => {
              console.log("Mock Firestore update called with:", data);
            },
          }),
        }),
      } as unknown as Firestore;
    } else {
      firestoreInstance = new Firestore();
    }
  }
  return firestoreInstance;
}

// Reset Firestore instance (for testing)
export function resetFirestore(): void {
  firestoreInstance = null;
}

// Export collection reference
export const users = getFirestore().collection("users");