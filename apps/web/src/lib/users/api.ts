/**
 * ユーザープロフィール情報のAPI
 * 
 * Firestoreからユーザープロフィール情報を取得・更新するための関数群
 */
import {
  collection,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "../firebase/client";
import type { UserProfile, UserProfileData, UserProfileFormData } from "./types";
import type { UserRecord } from "firebase-admin/auth";
import type { User } from "firebase/auth";

/**
 * ユーザープロフィール情報をFirestoreから取得
 *
 * @param uid ユーザーID
 * @returns ユーザープロフィール情報またはnull（存在しない場合）
 */
export async function getUserProfile(uid: string): Promise<UserProfileData | null> {
  try {
    const userRef = doc(db, "userProfiles", uid);
    const userSnapshot = await getDoc(userRef);

    if (!userSnapshot.exists()) {
      return null;
    }

    const data = userSnapshot.data();
    return {
      uid: userSnapshot.id,
      siteDisplayName: data.siteDisplayName,
      bio: data.bio,
      isPublic: data.isPublic ?? false,
      updatedAt: data.updatedAt?.toDate() ?? new Date(),
      createdAt: data.createdAt?.toDate() ?? new Date(),
    };
  } catch (error) {
    console.error("ユーザープロフィールの取得に失敗しました:", error);
    throw error;
  }
}

/**
 * ユーザープロフィール情報をFirestoreに保存または更新
 *
 * @param uid ユーザーID
 * @param profileData プロフィール情報
 * @returns 保存に成功したかどうか
 */
export async function updateUserProfile(
  uid: string,
  profileData: UserProfileFormData
): Promise<boolean> {
  try {
    const userRef = doc(db, "userProfiles", uid);
    const userSnapshot = await getDoc(userRef);
    
    // 既存プロフィールが存在するか確認
    if (userSnapshot.exists()) {
      // 更新の場合
      await setDoc(
        userRef,
        {
          ...profileData,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } else {
      // 新規作成の場合
      await setDoc(userRef, {
        ...profileData,
        uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    return true;
  } catch (error) {
    console.error("ユーザープロフィールの更新に失敗しました:", error);
    return false;
  }
}

/**
 * Firebase AuthとFirestoreのユーザー情報を統合
 *
 * @param authUser Firebase AuthのユーザーオブジェクトまたはUserRecord
 * @param profileData Firestoreから取得したプロフィールデータ
 * @returns 統合されたユーザープロフィール
 */
export function mergeUserData(
  authUser: User | UserRecord | null,
  profileData: UserProfileData | null
): UserProfile | null {
  if (!authUser) return null;
  if (!profileData) {
    // プロフィールデータがない場合は、基本情報のみのプロフィールを返す
    return {
      uid: authUser.uid,
      displayName: authUser.displayName,
      photoURL: authUser.photoURL,
      isPublic: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      // サイト用の表示名がなければAuth由来の表示名、それもなければUIDの先頭8文字
      preferredName: authUser.displayName || authUser.uid.substring(0, 8),
    };
  }

  // プロフィールデータがある場合は、両方の情報を統合
  return {
    ...profileData,
    displayName: authUser.displayName,
    photoURL: authUser.photoURL,
    preferredName: profileData.siteDisplayName || authUser.displayName || authUser.uid.substring(0, 8),
  };
}