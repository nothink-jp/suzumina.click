import type { UserRecord } from "firebase-admin/auth";
import type { User } from "firebase/auth";
/**
 * ユーザープロフィール情報のAPI
 *
 * Firestoreからユーザープロフィール情報を取得・更新するための関数群
 */
import {
  type Firestore,
  Timestamp,
  collection,
  doc,
  getDoc,
  getFirestore,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { app } from "../firebase/client"; // appをインポート
import type {
  UserProfile,
  UserProfileData,
  UserProfileFormData,
} from "./types";

/**
 * Firestoreインスタンスを取得
 * クライアントサイドでのみ実行されることに注意
 */
const getFirestoreInstance = (): Firestore | null => {
  // ブラウザでのみFirestoreを初期化
  if (typeof window === "undefined") {
    return null;
  }

  try {
    if (!app) {
      throw new Error("Firebaseアプリが初期化されていません");
    }
    return getFirestore(app);
  } catch (error) {
    console.error("Firestoreの初期化に失敗しました:", error);
    return null;
  }
};

/**
 * ユーザープロフィール情報をFirestoreから取得
 *
 * @param uid ユーザーID
 * @returns ユーザープロフィール情報またはnull（存在しない場合）
 */
export async function getUserProfile(
  uid: string,
): Promise<UserProfileData | null> {
  try {
    // Firestoreインスタンスの取得
    const db = getFirestoreInstance();
    if (!db) {
      console.error("Firestoreインスタンスが初期化されていません");
      return null;
    }

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
  profileData: UserProfileFormData,
): Promise<boolean> {
  try {
    // Firestoreインスタンスの取得
    const db = getFirestoreInstance();
    if (!db) {
      console.error("Firestoreインスタンスが初期化されていません");
      return false;
    }

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
        { merge: true },
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
  profileData: UserProfileData | null,
): UserProfile | null {
  if (!authUser) return null;
  if (!profileData) {
    // プロフィールデータがない場合は、基本情報のみのプロフィールを返す
    return {
      uid: authUser.uid,
      displayName: authUser.displayName ?? null,
      photoURL: authUser.photoURL ?? null,
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
    displayName: authUser.displayName ?? null,
    photoURL: authUser.photoURL ?? null,
    preferredName:
      profileData.siteDisplayName ||
      authUser.displayName ||
      authUser.uid.substring(0, 8),
  };
}
