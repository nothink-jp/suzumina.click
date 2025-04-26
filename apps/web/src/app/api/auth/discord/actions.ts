"use server";

/**
 * Discord認証のServer Actions
 *
 * Next.jsのServer Actionsを使用してDiscord認証を処理する
 */

import axios from "axios";
import { initializeFirebaseAdmin } from "../firebase-admin";
import type { DiscordAuthResult, DiscordGuild, DiscordUser } from "./types";
import { getDiscordAvatarUrl, validateEnvironmentVariables } from "./utils";

/**
 * Discord認証コールバックを処理するServer Action
 *
 * 1. Discordからアクセストークンを取得
 * 2. ユーザー情報を取得
 * 3. ギルドメンバーシップを確認
 * 4. Firebase Authでユーザー情報を更新/作成
 * 5. カスタムトークンを生成してクッキーに保存
 *
 * @param code - Discord認証コード
 * @returns 認証処理の結果
 */
export async function handleDiscordCallback(
  code: string,
): Promise<DiscordAuthResult> {
  try {
    // 環境変数の検証
    const { clientId, clientSecret, redirectUri, targetGuildId } =
      validateEnvironmentVariables();

    // 1. Discordからアクセストークンを取得
    console.log("Discordアクセストークンをリクエスト中...");
    const tokenResponse = await axios.post<{ access_token: string }>(
      "https://discord.com/api/oauth2/token",
      new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        code: code,
        redirect_uri: redirectUri,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
    );

    const accessToken = tokenResponse.data.access_token;
    console.log("Discordアクセストークンを取得しました");

    // 2. Discordからユーザー情報を取得
    console.log("Discordユーザー情報を取得中...");
    const userResponse = await axios.get<DiscordUser>(
      "https://discord.com/api/users/@me",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );

    const discordUser = userResponse.data;
    const discordUserId = discordUser.id;
    const discordUsername = discordUser.username;
    const discordEmail = discordUser.email;
    const discordAvatarHash = discordUser.avatar;
    const discordAvatarUrl = getDiscordAvatarUrl(
      discordUserId,
      discordAvatarHash,
    );

    console.log("Discordユーザー情報を取得しました", {
      discordUserId,
      discordUsername,
      discordEmail: discordEmail ? "***@***.***" : null, // ログにメールアドレスを出力しない
      discordAvatarUrl: discordAvatarUrl ? "存在します" : "未設定",
    });

    // 3. Discordからギルド情報を取得
    console.log("Discordユーザーのギルド情報を取得中...");
    const guildsResponse = await axios.get<DiscordGuild[]>(
      "https://discord.com/api/users/@me/guilds",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );

    const userGuilds = guildsResponse.data;
    console.log("Discordユーザーのギルド情報を取得しました", {
      guildCount: userGuilds.length,
    });

    // 4. ターゲットギルドに所属しているか確認
    const isMember = userGuilds.some(
      (guild: DiscordGuild) => guild.id === targetGuildId,
    );

    if (!isMember) {
      console.warn("ユーザーが対象ギルドのメンバーではありません", {
        discordUserId,
        targetGuildId,
      });
      return {
        success: false,
        error: "Guild membership required.",
      };
    }

    console.log("ユーザーは対象ギルドのメンバーです", { discordUserId });

    // 5. Firebase Auth ユーザー情報の更新または作成
    const auth = initializeFirebaseAdmin();

    // 更新/作成するユーザー情報を準備
    const userProperties = {
      displayName: discordUsername,
      photoURL: discordAvatarUrl,
      email: discordEmail ?? undefined,
    };

    try {
      // 既存ユーザーの情報を更新
      console.log("Firebaseユーザー情報を更新中...", {
        uid: discordUserId,
      });
      await auth.updateUser(discordUserId, userProperties);
      console.log("Firebaseユーザー情報を更新しました", {
        uid: discordUserId,
      });
    } catch (error: unknown) {
      const firebaseError = error as { code?: string };
      if (firebaseError.code === "auth/user-not-found") {
        // ユーザーが存在しない場合は新規作成
        console.log("Firebaseユーザーが見つからないため、新規作成します", {
          uid: discordUserId,
        });
        await auth.createUser({
          uid: discordUserId,
          ...userProperties,
        });
        console.log("Firebaseユーザーを作成しました", { uid: discordUserId });
      } else {
        // その他のエラーは再スロー
        console.error(
          "Firebaseユーザーの更新/作成中にエラーが発生しました:",
          error,
        );
        throw error;
      }
    }

    // 6. Firebase カスタムトークンを生成
    console.log("Firebaseカスタムトークンを作成中...");
    const customToken = await auth.createCustomToken(discordUserId);
    console.log("Firebaseカスタムトークンを作成しました", { discordUserId });

    // 7. カスタムトークンをレスポンスとして返す
    // クッキーの設定はクライアント側で行う
    // Server Actionsからは直接クッキーを設定できないため、
    // 認証結果とカスタムトークンを返す
    return {
      success: true,
      customToken,
    };
  // biome-ignore lint/suspicious/noExplicitAny: Discord error message
  } catch (error: any) {
    console.error("Discord認証コールバック中にエラーが発生しました:", error);

    if (axios.isAxiosError(error)) {
      console.error("Axiosエラーの詳細:", {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });
    }

    return {
      success: false,
      error: error?.message || "Internal server error.",
    };
  }
}
