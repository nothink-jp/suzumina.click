"use server";

import type { UserProfile, UserProfileData } from "@/lib/users/types";
import { getFirestore } from "firebase-admin/firestore";
import { initializeFirebaseAdmin } from "../auth/firebase-admin";
import { getCurrentUser } from "../auth/getCurrentUser";

/**
 * サーバーサイドでユーザープロフィール情報を取得する関数
 *
 * @param uid 取得対象のユーザーID（指定しない場合は現在ログイン中のユーザー）
 * @returns 統合されたユーザープロフィール情報またはnull（未ログインの場合）
 */
export async function getProfile(uid?: string): Promise<UserProfile | null> {
  try {
    // 現在のユーザー情報を取得
    const currentUser = await getCurrentUser();

    // デバッグ用：現在のユーザー情報をログ出力
    console.log(
      "現在のユーザー情報:",
      currentUser
        ? {
            uid: currentUser.uid,
            displayName: currentUser.displayName,
            email: currentUser.email,
          }
        : "未ログイン",
    );

    // UIDが指定されていなければ現在のユーザーのUIDを使用
    const targetUid = uid || currentUser?.uid;

    // ログインしていない場合
    if (!targetUid) {
      console.log("ターゲットUIDがありません。未ログイン状態です。");
      return null;
    }

    // Firestore初期化
    const auth = initializeFirebaseAdmin();
    const firestore = getFirestore();

    // デバッグ用：Firestoreが初期化されたことを確認
    console.log(
      `Firestoreからユーザープロフィール情報を取得します: ${targetUid}`,
    );

    // Firestoreからユーザープロフィール情報を取得
    const profileDoc = await firestore
      .collection("userProfiles")
      .doc(targetUid)
      .get();

    // デバッグ用：プロフィール情報の取得結果をログ出力
    console.log(
      `プロフィール情報の取得結果: ${profileDoc.exists ? "存在します" : "存在しません"}`,
    );

    let profileData: UserProfileData | null = null;

    if (profileDoc.exists) {
      const data = profileDoc.data();
      profileData = {
        uid: targetUid,
        siteDisplayName: data?.siteDisplayName,
        bio: data?.bio,
        isPublic: data?.isPublic ?? false,
        updatedAt: data?.updatedAt?.toDate() ?? new Date(),
        createdAt: data?.createdAt?.toDate() ?? new Date(),
      };
    } else {
      // プロフィールが存在しない場合は、デフォルト値を設定
      console.log(
        `ユーザー ${targetUid} のプロフィール情報がまだ作成されていません。デフォルト値を使用します。`,
      );
    }

    // 他のユーザーのプロフィールを閲覧する場合、
    // 非公開設定のプロフィールは本人以外閲覧不可
    if (
      uid &&
      currentUser?.uid !== uid &&
      profileData &&
      !profileData.isPublic
    ) {
      return null;
    }

    // ユーザー情報がない場合
    if (!currentUser) {
      return null;
    }

    // Firebase AuthとFirestoreの情報を統合
    const mergedProfile = {
      ...(profileData || {
        uid: targetUid,
        isPublic: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
      displayName: currentUser.displayName,
      photoURL: currentUser.photoURL,
      email: currentUser.email,
      preferredName:
        profileData?.siteDisplayName ||
        currentUser.displayName ||
        targetUid.substring(0, 8),
    };

    // デバッグ用：統合されたプロフィール情報をログ出力
    console.log("統合されたプロフィール情報:", {
      uid: mergedProfile.uid,
      displayName: mergedProfile.displayName,
      preferredName: mergedProfile.preferredName,
      email: mergedProfile.email,
      hasCustomProfile: !!profileData,
    });

    return mergedProfile;
  } catch (error) {
    console.error("プロフィール情報の取得に失敗しました:", error);
    return null;
  }
}
