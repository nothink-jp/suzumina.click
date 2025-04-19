// functions/src/discordAuth.ts
import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import axios from "axios";
import type { AxiosError } from "axios";
import type { FirebaseAuthError } from "firebase-admin/auth";
import * as admin from "firebase-admin"; // admin をインポート
import {
  getDiscordAvatarUrl,
  type DiscordUser,
  type DiscordGuild,
} from "./common"; // 共通モジュールからインポート
import { initializeFirebaseAdmin } from "./firebaseAdmin"; // Firebase Admin 初期化をインポート

initializeFirebaseAdmin(); // Firebase Admin SDK を初期化

// Discord 認証コールバック関数
export const discordAuthCallback = onRequest(
  {
    region: "asia-northeast1",
    secrets: [
      "DISCORD_CLIENT_SECRET",
      "DISCORD_CLIENT_ID",
      "DISCORD_REDIRECT_URI",
      "DISCORD_TARGET_GUILD_ID",
    ],
  },
  async (request, response) => {
    // --- CORS Headers ---
    const allowedOrigin = "https://suzumina-click-firebase.web.app"; // TODO: Consider making this configurable
    response.set("Access-Control-Allow-Origin", allowedOrigin);
    response.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    response.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    response.set("Access-Control-Max-Age", "3600");

    // --- Handle Preflight (OPTIONS) Request ---
    if (request.method === "OPTIONS") {
      response.status(204).send("");
      return;
    }

    // --- Handle Actual Request (Expecting POST) ---
    logger.info("Discord Auth Callback received", { method: request.method });

    if (request.method !== "POST") {
      logger.error("Method Not Allowed (Should be POST)", {
        method: request.method,
      });
      response.status(405).send("Method Not Allowed");
      return;
    }

    const code = request.body.code as string | undefined;

    if (!code) {
      logger.error("Authorization code not found in request body");
      response
        .status(400)
        .send({ success: false, error: "Authorization code is required." });
      return;
    }

    // process.env からすべての設定値を取得
    const clientId = process.env.DISCORD_CLIENT_ID;
    const clientSecret = process.env.DISCORD_CLIENT_SECRET;
    const redirectUri = process.env.DISCORD_REDIRECT_URI;
    const targetGuildId = process.env.DISCORD_TARGET_GUILD_ID;

    if (!clientId || !clientSecret || !redirectUri || !targetGuildId) {
      logger.error(
        "Discord configuration environment variables (from secrets) are not set correctly.",
        {
          clientIdExists: !!clientId,
          clientSecretExists: !!clientSecret,
          redirectUriExists: !!redirectUri,
          targetGuildIdExists: !!targetGuildId,
        },
      );
      response
        .status(500)
        .send({ success: false, error: "Server configuration error." });
      return;
    }

    try {
      // --- 1. Discord からアクセストークンを取得 ---
      logger.info("Requesting Discord access token...");
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
      logger.info("Discord access token obtained.");

      // --- 2. Discord からユーザー情報を取得 ---
      logger.info("Fetching Discord user info...");
      const userResponse = await axios.get<DiscordUser>(
        "https://discord.com/api/users/@me",
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );
      const discordUser = userResponse.data;
      const discordUserId = discordUser.id;
      const discordUsername = discordUser.username;
      const discordEmail = discordUser.email; // string | null
      const discordAvatarHash = discordUser.avatar;
      const discordAvatarUrl = getDiscordAvatarUrl(
        discordUserId,
        discordAvatarHash,
      );
      logger.info("Discord user info fetched", {
        discordUserId,
        discordUsername,
        discordEmail,
        discordAvatarUrl,
      });

      // --- 3. Discord から所属ギルド情報を取得 ---
      logger.info("Fetching Discord user guilds...");
      const guildsResponse = await axios.get<DiscordGuild[]>(
        "https://discord.com/api/users/@me/guilds",
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );
      const userGuilds = guildsResponse.data;
      logger.info("Discord user guilds fetched", {
        guildCount: userGuilds.length,
      });

      // --- 4. ターゲットギルドに所属しているか確認 ---
      const isMember = userGuilds.some(
        (guild: DiscordGuild) => guild.id === targetGuildId,
      );

      if (!isMember) {
        logger.warn("User is not a member of the target guild", {
          discordUserId,
          targetGuildId,
        });
        response
          .status(403)
          .send({ success: false, error: "Guild membership required." });
        return;
      }
      logger.info("User is a member of the target guild", { discordUserId });

      // --- 5. Firebase Auth ユーザー情報の更新または作成 ---
      // 更新/作成するユーザー情報を準備 (email が null の場合は undefined に変換)
      const userProperties = {
        displayName: discordUsername,
        photoURL: discordAvatarUrl,
        email: discordEmail ?? undefined, // nullish coalescing operator を使用
      };

      try {
        // 既存ユーザーの情報を更新
        logger.info("Updating Firebase user...", {
          uid: discordUserId,
          properties: userProperties,
        });
        await admin.auth().updateUser(discordUserId, userProperties);
        logger.info("Firebase user updated.", { uid: discordUserId });
      } catch (error: unknown) {
        const firebaseAuthError = error as FirebaseAuthError;
        if (firebaseAuthError.code === "auth/user-not-found") {
          // ユーザーが存在しない場合は新規作成
          logger.info("Firebase user not found, creating new user...", {
            uid: discordUserId,
            properties: userProperties,
          });
          await admin.auth().createUser({
            uid: discordUserId,
            ...userProperties,
          });
          logger.info("Firebase user created.", { uid: discordUserId });
        } else {
          // その他の Firebase Auth エラーは再スロー
          logger.error("Error updating/creating Firebase user:", error);
          throw error;
        }
      }

      // --- 6. Firebase カスタムトークンを生成 ---
      logger.info("Creating Firebase custom token...");
      const customToken = await admin.auth().createCustomToken(discordUserId);
      logger.info("Firebase custom token created", { discordUserId });

      // --- 7. カスタムトークンを返す ---
      response.status(200).send({ success: true, customToken });
    } catch (error: unknown) {
      logger.error("Error during Discord auth callback:", error);
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        logger.error("Axios error details:", {
          status: axiosError.response?.status,
          data: axiosError.response?.data,
          message: axiosError.message,
        });
      } else if (error instanceof Error) {
        logger.error("Generic error details:", {
          message: error.message,
          stack: error.stack,
        });
      }
      response
        .status(500)
        .send({ success: false, error: "Internal server error." });
    }
  },
);
