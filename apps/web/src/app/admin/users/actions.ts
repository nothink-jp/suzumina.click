"use server";

import {
  type ActionResult,
  type FrontendUserData,
  type UserListResult,
  type UserQuery,
  UserQuerySchema,
} from "@suzumina.click/shared-types";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getFirestore } from "@/lib/firestore";
import { getUserList } from "@/lib/user-firestore";

/**
 * Admin権限チェック
 */
async function requireAdmin() {
  const session = await auth();
  if (!session?.user) {
    redirect("/auth/signin");
  }
  if (session.user.role !== "admin") {
    redirect("/");
  }
  return session.user;
}

/**
 * ユーザー一覧を取得（管理者用）
 */
export async function getUsers(query: UserQuery): Promise<UserListResult> {
  await requireAdmin();

  try {
    const validatedQuery = UserQuerySchema.parse({
      ...query,
      onlyPublic: false, // 管理者は全ユーザーを見る
    });

    return await getUserList(validatedQuery);
  } catch (error) {
    console.error("Error getting users:", error);
    throw new Error("ユーザー一覧の取得に失敗しました");
  }
}

/**
 * ユーザーロールを更新
 */
export async function updateUserRole(
  discordId: string,
  newRole: "member" | "moderator" | "admin",
): Promise<ActionResult<FrontendUserData>> {
  const admin = await requireAdmin();

  try {
    // 自分自身のロールは変更できない
    if (admin.discordId === discordId) {
      return {
        success: false,
        error: "自分自身のロールは変更できません",
      };
    }

    const firestore = getFirestore();
    const now = new Date().toISOString();

    await firestore.collection("users").doc(discordId).update({
      role: newRole,
      updatedAt: now,
    });

    // 更新後のユーザー情報を取得
    const userDoc = await firestore.collection("users").doc(discordId).get();
    if (!userDoc.exists) {
      throw new Error("ユーザーが見つかりません");
    }

    const userData = userDoc.data() as FrontendUserData;

    return {
      success: true,
      data: userData,
    };
  } catch (error) {
    console.error("Error updating user role:", error);
    return {
      success: false,
      error: "ユーザーロールの更新に失敗しました",
    };
  }
}

/**
 * ユーザーの有効/無効を切り替え
 */
export async function toggleUserActive(
  discordId: string,
): Promise<ActionResult<FrontendUserData>> {
  const admin = await requireAdmin();

  try {
    // 自分自身は無効化できない
    if (admin.discordId === discordId) {
      return {
        success: false,
        error: "自分自身を無効化することはできません",
      };
    }

    const firestore = getFirestore();
    const userDoc = await firestore.collection("users").doc(discordId).get();

    if (!userDoc.exists) {
      return {
        success: false,
        error: "ユーザーが見つかりません",
      };
    }

    const currentData = userDoc.data();
    const newIsActive = !currentData?.isActive;
    const now = new Date().toISOString();

    await firestore.collection("users").doc(discordId).update({
      isActive: newIsActive,
      updatedAt: now,
    });

    // 更新後のユーザー情報を取得
    const updatedDoc = await firestore.collection("users").doc(discordId).get();
    const userData = updatedDoc.data() as FrontendUserData;

    return {
      success: true,
      data: userData,
    };
  } catch (error) {
    console.error("Error toggling user active status:", error);
    return {
      success: false,
      error: "ユーザー状態の変更に失敗しました",
    };
  }
}

/**
 * ユーザー統計情報を取得
 */
export async function getUserStats(): Promise<{
  totalUsers: number;
  activeUsers: number;
  adminUsers: number;
  moderatorUsers: number;
}> {
  await requireAdmin();

  try {
    const firestore = getFirestore();
    const usersCollection = firestore.collection("users");

    const [totalSnapshot, activeSnapshot, adminSnapshot, moderatorSnapshot] =
      await Promise.all([
        usersCollection.get(),
        usersCollection.where("isActive", "==", true).get(),
        usersCollection.where("role", "==", "admin").get(),
        usersCollection.where("role", "==", "moderator").get(),
      ]);

    return {
      totalUsers: totalSnapshot.size,
      activeUsers: activeSnapshot.size,
      adminUsers: adminSnapshot.size,
      moderatorUsers: moderatorSnapshot.size,
    };
  } catch (error) {
    console.error("Error getting user stats:", error);
    throw new Error("ユーザー統計の取得に失敗しました");
  }
}
