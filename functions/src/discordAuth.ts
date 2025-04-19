// functions/src/discordAuth.ts
import { onRequest } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import axios from "axios";
import type { AxiosError } from "axios";
import type { FirebaseAuthError } from "firebase-admin/auth";
import * as admin from "firebase-admin";
import {
  getDiscordAvatarUrl,
  type DiscordUser,
  type DiscordGuild,
} from "./common";
import { initializeFirebaseAdmin } from "./firebaseAdmin";

initializeFirebaseAdmin();

/**
 * Discord認証コールバック関数
 * 
 * Discord OAuth2認証フローのコールバック処理を行い、以下の機能を実装:
 * 1. 認証コードを使用してDiscordからアクセストークンを取得
 * 2. アクセストークンを使用してユーザー情報を取得
 * 3. ユーザーが指定されたDiscordギルドに所属しているか確認
 * 4. Firebase Authenticationでユーザー情報を更新または新規作成
 * 5. Firebaseカスタム認証トークンを生成して返却
 * 
 * CORS対応も実装しており、プリフライトリクエスト(OPTIONS)も正しく処理
 */
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
    // CORS ヘッダー設定
    const allowedOrigin = "https://suzumina-click-firebase.web.app"; // TODO: 将来的に設定可能にすることを検討
    response.set("Access-Control-Allow-Origin", allowedOrigin);
    response.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    response.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    response.set("Access-Control-Max-Age", "3600");

    // プリフライトリクエスト（OPTIONS）の処理
    if (request.method === "OPTIONS") {
      response.status(204).send("");
      return;
    }

    logger.info("Discord認証コールバックを受信しました", { method: request.method });

    // POSTメソッド以外は拒否
    if (request.method !== "POST") {
      logger.error("許可されていないメソッドです（POSTメソッドのみ許可）", {
        method: request.method,
      });
      response.status(405).send("Method Not Allowed");
      return;
    }

    // 認証コードの検証
    const code = request.body.code as string | undefined;

    if (!code) {
      logger.error("リクエスト本文に認証コードが見つかりません");
      response
        .status(400)
        .send({ success: false, error: "Authorization code is required." });
      return;
    }

    // 環境変数から設定値を取得
    const clientId = process.env.DISCORD_CLIENT_ID;
    const clientSecret = process.env.DISCORD_CLIENT_SECRET;
    const redirectUri = process.env.DISCORD_REDIRECT_URI;
    const targetGuildId = process.env.DISCORD_TARGET_GUILD_ID;

    // 環境変数の検証
    if (!clientId || !clientSecret || !redirectUri || !targetGuildId) {
      logger.error(
        "Discord設定用の環境変数（シークレットから）が正しく設定されていません",
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
      // 1. Discord からアクセストークンを取得
      logger.info("Discordアクセストークンをリクエスト中...");
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
      logger.info("Discordアクセストークンを取得しました");

      // 2. Discord からユーザー情報を取得
      logger.info("Discordユーザー情報を取得中...");
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
      logger.info("Discordユーザー情報を取得しました", {
        discordUserId,
        discordUsername,
        discordEmail,
        discordAvatarUrl,
      });

      // 3. Discord から所属ギルド情報を取得
      logger.info("Discordユーザーのギルド情報を取得中...");
      const guildsResponse = await axios.get<DiscordGuild[]>(
        "https://discord.com/api/users/@me/guilds",
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );
      const userGuilds = guildsResponse.data;
      logger.info("Discordユーザーのギルド情報を取得しました", {
        guildCount: userGuilds.length,
      });

      // 4. ターゲットギルドに所属しているか確認
      const isMember = userGuilds.some(
        (guild: DiscordGuild) => guild.id === targetGuildId,
      );

      if (!isMember) {
        logger.warn("ユーザーが対象ギルドのメンバーではありません", {
          discordUserId,
          targetGuildId,
        });
        response
          .status(403)
          .send({ success: false, error: "Guild membership required." });
        return;
      }
      logger.info("ユーザーは対象ギルドのメンバーです", { discordUserId });

      // 5. Firebase Auth ユーザー情報の更新または作成
      // 更新/作成するユーザー情報を準備 (email が null の場合は undefined に変換)
      const userProperties = {
        displayName: discordUsername,
        photoURL: discordAvatarUrl,
        email: discordEmail ?? undefined,
      };

      try {
        // 既存ユーザーの情報を更新
        logger.info("Firebaseユーザー情報を更新中...", {
          uid: discordUserId,
          properties: userProperties,
        });
        await admin.auth().updateUser(discordUserId, userProperties);
        logger.info("Firebaseユーザー情報を更新しました", { uid: discordUserId });
      } catch (error: unknown) {
        const firebaseAuthError = error as FirebaseAuthError;
        if (firebaseAuthError.code === "auth/user-not-found") {
          // ユーザーが存在しない場合は新規作成
          logger.info("Firebaseユーザーが見つからないため、新規作成します", {
            uid: discordUserId,
            properties: userProperties,
          });
          await admin.auth().createUser({
            uid: discordUserId,
            ...userProperties,
          });
          logger.info("Firebaseユーザーを作成しました", { uid: discordUserId });
        } else {
          // その他の Firebase Auth エラーは再スロー
          logger.error("Firebaseユーザーの更新/作成中にエラーが発生しました:", error);
          throw error;
        }
      }

      // 6. Firebase カスタムトークンを生成
      logger.info("Firebaseカスタムトークンを作成中...");
      const customToken = await admin.auth().createCustomToken(discordUserId);
      logger.info("Firebaseカスタムトークンを作成しました", { discordUserId });

      // 7. カスタムトークンを返す
      response.status(200).send({ success: true, customToken });
    } catch (error: unknown) {
      logger.error("Discord認証コールバック中にエラーが発生しました:", error);
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        logger.error("Axiosエラーの詳細:", {
          status: axiosError.response?.status,
          data: axiosError.response?.data,
          message: axiosError.message,
        });
      } else if (error instanceof Error) {
        logger.error("一般エラーの詳細:", {
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
