"use server";

import { auth, signOut } from "@/auth";
import { Firestore } from "@google-cloud/firestore";
import type { Timestamp } from "@google-cloud/firestore";

/**
 * Firestore から取得するユーザーデータの型定義 (サーバーサイド専用)。
 */
interface UserData {
  id: string;
  displayName: string;
  avatarUrl: string;
  role: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * サーバーアクションとしてサインアウト処理を実行します。
 */
export async function signOutAction() {
  await signOut();
}

/**
 * 現在認証されているユーザーのセッション情報を取得します。
 * @returns 認証されている場合はユーザーオブジェクト、されていない場合は null。
 */
export async function getCurrentUser() {
  const session = await auth();
  return session?.user ?? null;
}

/**
 * 指定されたユーザー ID に対応するユーザーデータを Firestore から取得します。
 * @param userId - 取得するユーザーの ID。
 * @returns Firestore から取得したユーザーデータ。ユーザーが存在しない場合は null。
 */
export async function getUserData(userId: string) {
  const firestore = new Firestore();
  const userDoc = await firestore.collection("users").doc(userId).get();

  if (!userDoc.exists) {
    return null;
  }

  // Firestore のデータは UserData 型であると想定
  return userDoc.data() as UserData;
}
