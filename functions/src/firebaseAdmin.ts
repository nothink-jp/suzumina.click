// functions/src/firebaseAdmin.ts
import * as admin from "firebase-admin";

let initialized = false;

export function initializeFirebaseAdmin() {
  if (!initialized) {
    admin.initializeApp();
    initialized = true;
  }
}

// Firestore インスタンスをエクスポート (必要に応じて)
export const firestore = admin.firestore();
