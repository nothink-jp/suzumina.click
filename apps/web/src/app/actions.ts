"use server";

import { auth, signOut } from "@/auth";
import { Firestore } from "@google-cloud/firestore";
import type { Timestamp } from "@google-cloud/firestore";

// サーバーサイドでのみ使用する型定義
interface UserData {
  id: string;
  displayName: string;
  avatarUrl: string;
  role: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export async function signOutAction() {
  await signOut();
}

export async function getCurrentUser() {
  return auth().then((session) => session?.user ?? null);
}

export async function getUserData(userId: string) {
  const firestore = new Firestore();
  const userDoc = await firestore.collection("users").doc(userId).get();

  if (!userDoc.exists) {
    return null;
  }

  return userDoc.data() as UserData;
}