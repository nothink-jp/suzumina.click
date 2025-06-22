/**
 * ユーザー関連のFirestore操作を提供するモジュール
 */

import type { Query } from "@google-cloud/firestore";
import {
  type CreateUserInput,
  createDiscordAvatarUrl,
  type FirestoreUserData,
  FirestoreUserSchema,
  type FrontendUserData,
  FrontendUserSchema,
  formatMemberSince,
  formatRelativeTime,
  resolveDisplayName,
  type UpdateUserInput,
  type UserListResult,
  type UserQuery,
} from "@suzumina.click/shared-types";
import { getFirestore } from "./firestore";

/**
 * Firestoreユーザーデータをフロントエンド表示用に変換
 */
export function convertToFrontendUser(
  data: FirestoreUserData,
): FrontendUserData {
  const frontendData: FrontendUserData = {
    discordId: data.discordId,
    username: data.username,
    globalName: data.globalName,
    avatar: data.avatar,
    displayName: data.displayName,
    role: data.role,
    audioReferencesCount: data.audioReferencesCount,
    totalPlayCount: data.totalPlayCount,
    createdAt: data.createdAt,
    lastLoginAt: data.lastLoginAt,
    isPublicProfile: data.isPublicProfile,
    showStatistics: data.showStatistics,

    // 表示用の追加情報
    avatarUrl: createDiscordAvatarUrl(data.discordId, data.avatar),
    memberSince: formatMemberSince(data.createdAt),
    lastActiveText: formatRelativeTime(data.lastLoginAt),
  };

  try {
    return FrontendUserSchema.parse(frontendData);
  } catch (error) {
    console.error("ユーザーフロントエンド変換中のスキーマ検証エラー:", error);
    throw new Error("ユーザーデータの形式が無効です");
  }
}

/**
 * Discord IDでユーザーを取得
 */
export async function getUserByDiscordId(
  discordId: string,
): Promise<FrontendUserData | null> {
  try {
    const firestore = getFirestore();
    const userDoc = await firestore.collection("users").doc(discordId).get();

    if (!userDoc.exists) {
      return null;
    }

    const userData = userDoc.data() as FirestoreUserData;
    return convertToFrontendUser(userData);
  } catch (error) {
    console.error("Error getting user by Discord ID:", error);
    throw new Error("ユーザー情報の取得に失敗しました");
  }
}

/**
 * 新しいユーザーを作成
 */
export async function createUser(
  input: CreateUserInput,
): Promise<FrontendUserData> {
  try {
    const firestore = getFirestore();
    const now = new Date().toISOString();

    // 表示名の決定
    const displayName =
      input.displayName ||
      resolveDisplayName(
        undefined,
        input.discordUser.globalName,
        input.discordUser.username,
      );

    const userData: FirestoreUserData = {
      discordId: input.discordUser.id,
      username: input.discordUser.username,
      globalName: input.discordUser.globalName,
      avatar: input.discordUser.avatar,
      guildMembership: input.guildMembership,
      displayName,
      isActive: true,
      role: "member",
      audioReferencesCount: 0,
      totalPlayCount: 0,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now,
      isPublicProfile: true,
      showStatistics: true,
    };

    // スキーマ検証
    const validatedData = FirestoreUserSchema.parse(userData);

    // Firestoreに保存
    await firestore
      .collection("users")
      .doc(input.discordUser.id)
      .set(validatedData);

    console.log(`New user created: ${input.discordUser.id} (${displayName})`);
    return convertToFrontendUser(validatedData);
  } catch (error) {
    console.error("Error creating user:", error);
    throw new Error("ユーザー作成に失敗しました");
  }
}

/**
 * ユーザー情報を更新
 */
export async function updateUser(
  input: UpdateUserInput,
): Promise<FrontendUserData> {
  try {
    const firestore = getFirestore();
    const now = new Date().toISOString();

    const updateData: Partial<FirestoreUserData> = {
      updatedAt: now,
      ...(input.displayName && { displayName: input.displayName }),
      ...(input.isPublicProfile !== undefined && {
        isPublicProfile: input.isPublicProfile,
      }),
      ...(input.showStatistics !== undefined && {
        showStatistics: input.showStatistics,
      }),
    };

    await firestore.collection("users").doc(input.discordId).update(updateData);

    // 更新後のデータを取得
    const updatedUser = await getUserByDiscordId(input.discordId);
    if (!updatedUser) {
      throw new Error("更新後のユーザーデータが見つかりません");
    }

    console.log(`User updated: ${input.discordId}`);
    return updatedUser;
  } catch (error) {
    console.error("Error updating user:", error);
    throw new Error("ユーザー更新に失敗しました");
  }
}

/**
 * 最終ログイン時刻を更新
 */
export async function updateLastLogin(discordId: string): Promise<void> {
  try {
    const firestore = getFirestore();
    const now = new Date().toISOString();

    await firestore.collection("users").doc(discordId).update({
      lastLoginAt: now,
      updatedAt: now,
    });

    console.log(`Last login updated for user: ${discordId}`);
  } catch (error) {
    console.error("Error updating last login:", error);
    // ログイン時刻更新の失敗は致命的ではないため、エラーを投げない
  }
}

/**
 * ユーザーの統計情報を更新
 */
export async function updateUserStats(
  discordId: string,
  updates: {
    incrementAudioReferences?: boolean;
    incrementPlayCount?: number;
  },
): Promise<void> {
  try {
    const firestore = getFirestore();
    const now = new Date().toISOString();

    const updateData: Partial<FirestoreUserData> = {
      updatedAt: now,
    };

    if (updates.incrementAudioReferences) {
      updateData.audioReferencesCount = 1; // Firestore increment
    }

    if (updates.incrementPlayCount && updates.incrementPlayCount > 0) {
      updateData.totalPlayCount = updates.incrementPlayCount; // Firestore increment
    }

    await firestore.collection("users").doc(discordId).update(updateData);

    console.log(`User stats updated for: ${discordId}`);
  } catch (error) {
    console.error("Error updating user stats:", error);
    // 統計更新の失敗は致命的ではないため、エラーを投げない
  }
}

/**
 * ユーザー一覧を取得（管理者用）
 */
export async function getUserList(query: UserQuery): Promise<UserListResult> {
  try {
    const firestore = getFirestore();
    let firestoreQuery: Query = firestore.collection("users");

    // 公開プロファイルのみのフィルター
    if (query.onlyPublic) {
      firestoreQuery = firestoreQuery.where("isPublicProfile", "==", true);
    }

    // ロールフィルター
    if (query.role) {
      firestoreQuery = firestoreQuery.where("role", "==", query.role);
    }

    // ソート設定
    switch (query.sortBy) {
      case "newest":
        firestoreQuery = firestoreQuery.orderBy("createdAt", "desc");
        break;
      case "oldest":
        firestoreQuery = firestoreQuery.orderBy("createdAt", "asc");
        break;
      case "mostActive":
        firestoreQuery = firestoreQuery.orderBy("lastLoginAt", "desc");
        break;
      case "alphabetical":
        firestoreQuery = firestoreQuery.orderBy("displayName", "asc");
        break;
      default:
        firestoreQuery = firestoreQuery.orderBy("createdAt", "desc");
    }

    // ページネーション
    if (query.startAfter) {
      const startAfterDoc = await firestore
        .collection("users")
        .doc(query.startAfter)
        .get();
      if (startAfterDoc.exists) {
        firestoreQuery = firestoreQuery.startAfter(startAfterDoc);
      }
    }

    firestoreQuery = firestoreQuery.limit(query.limit + 1); // +1 for hasMore check

    const snapshot = await firestoreQuery.get();
    const docs = snapshot.docs;

    const hasMore = docs.length > query.limit;
    const users = docs.slice(0, query.limit).map((doc) => {
      const userData = doc.data() as FirestoreUserData;
      return convertToFrontendUser(userData);
    });

    // テキスト検索（フロントエンド側でフィルタリング）
    let filteredUsers = users;
    if (query.searchText) {
      const searchTerms = query.searchText.toLowerCase().split(/\s+/);
      filteredUsers = users.filter((user) => {
        const searchableText = [
          user.username,
          user.globalName || "",
          user.displayName,
        ]
          .join(" ")
          .toLowerCase();

        return searchTerms.every((term) => searchableText.includes(term));
      });
    }

    return {
      users: filteredUsers,
      hasMore,
      lastUser:
        filteredUsers.length > 0
          ? filteredUsers[filteredUsers.length - 1]
          : undefined,
    };
  } catch (error) {
    console.error("Error getting user list:", error);
    throw new Error("ユーザー一覧の取得に失敗しました");
  }
}

/**
 * ユーザーが存在するかチェック
 */
export async function userExists(discordId: string): Promise<boolean> {
  try {
    const firestore = getFirestore();
    const userDoc = await firestore.collection("users").doc(discordId).get();
    return userDoc.exists;
  } catch (error) {
    console.error("Error checking user existence:", error);
    return false;
  }
}
