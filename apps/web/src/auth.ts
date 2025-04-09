import { Firestore } from "@google-cloud/firestore";
import type { Timestamp } from "@google-cloud/firestore";
import NextAuth, { type NextAuthConfig } from "next-auth"; // NextAuthConfig をインポート
import Discord from "next-auth/providers/discord";
import {
  ConfigurationError,
  getRequiredEnvVar,
  isBuildTime,
  isProductionRuntime,
} from "./auth/utils"; // utils からインポート

// NEXTAUTH_URLの取得と検証 (authConfig の外で実行)
const baseUrl = process.env.NEXTAUTH_URL;
if ((baseUrl === undefined || baseUrl === null) && isProductionRuntime()) {
  throw new ConfigurationError("NEXTAUTH_URL");
}
// ビルド時にはダミーURLを使用
const effectiveBaseUrl = isBuildTime() ? "https://example.com" : baseUrl;

const firestore = new Firestore();
const users = firestore.collection("users");

/**
 * Firestore に保存されるユーザーデータの型定義。
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
 * NextAuth の設定オブジェクト。
 * テストのためにエクスポートされます。
 */
export const authConfig: NextAuthConfig = {
  // effectiveBaseUrlがnullやundefinedでないことを確認して設定
  ...(effectiveBaseUrl && { url: new URL(effectiveBaseUrl) }),
  providers: [
    Discord({
      clientId: getRequiredEnvVar("DISCORD_CLIENT_ID"),
      clientSecret: getRequiredEnvVar("DISCORD_CLIENT_SECRET"),
      authorization: {
        url: "https://discord.com/api/oauth2/authorize",
        params: {
          scope: "identify guilds email",
        },
      },
    }),
  ],
  secret: getRequiredEnvVar("NEXTAUTH_SECRET"),
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  cookies: {
    sessionToken: {
      name: "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        // secure属性は本番ランタイム時のみtrueにする
        secure: isProductionRuntime(),
      },
    },
  },
  /**
   * NextAuth のコールバック関数。認証フローのカスタマイズに使用されます。
   */
  callbacks: {
    /**
     * サインイン処理中に呼び出されます。
     * Discord ギルドメンバーシップを確認し、Firestore にユーザー情報を保存/更新します。
     * メンバーでない場合は専用ページにリダイレクトします。
     * @param params - signIn コールバックのパラメータ。
     * @param params.account - プロバイダーのアカウント情報。
     * @param params.profile - プロバイダーから取得したユーザープロファイル。
     * @returns 認証を許可する場合は true、拒否する場合はリダイレクト先の URL 文字列、エラーの場合は false。
     */
    async signIn({ account, profile }) {
      if (!account?.access_token || account.provider !== "discord") {
        console.error("Invalid account data for Discord sign in.");
        return false; // エラーページへ
      }

      if (!profile?.id) {
        console.error("Invalid profile data from Discord.");
        return false; // エラーページへ
      }

      try {
        // Discord ギルドの確認
        const response = await fetch(
          "https://discord.com/api/users/@me/guilds",
          {
            headers: {
              Authorization: `Bearer ${account.access_token}`,
            },
          },
        );

        if (!response.ok) {
          console.error(
            "Failed to fetch Discord guild data:",
            await response.text(),
          );
          return false; // エラーページへ
        }

        const guilds = await response.json();
        const guildId = getRequiredEnvVar("DISCORD_GUILD_ID"); // エラーハンドリングを含む
        const isMember = guilds.some(
          (guild: { id: string }) => guild.id === guildId,
        );

        if (!isMember) {
          return "/auth/not-member"; // メンバーでない場合は専用ページへリダイレクト
        }

        // ユーザー情報の取得または作成
        const userRef = users.doc(profile.id);
        const userDoc = await userRef.get();
        const now = new Date();
        const userData = {
          displayName: profile.username ?? "",
          avatarUrl: profile.image_url ?? "",
          updatedAt: now,
        };

        if (!userDoc.exists) {
          // 新規ユーザー
          await userRef.set({
            ...userData,
            id: profile.id,
            role: "member", // デフォルトロール
            createdAt: now,
          });
        } else {
          // 既存ユーザー
          await userRef.update(userData);
        }

        return true; // 認証成功
      } catch (error) {
        if (error instanceof ConfigurationError) {
          console.error(
            "Authentication configuration error during signIn:",
            error.message,
          );
          return false; // 本番環境での設定エラーはエラーページへ
        }
        console.error("Error during sign in process:", error);
        return false; // その他のエラーもエラーページへ
      }
    },
    /**
     * セッションがチェックされるたびに呼び出されます。
     * JWT トークンからユーザー情報を取得し、セッションオブジェクトに追加します。
     * @param params - session コールバックのパラメータ。
     * @param params.session - 現在のセッションオブジェクト。
     * @param params.token - JWT トークン。
     * @returns 更新されたセッションオブジェクト。
     */
    async session({ session, token }) {
      if (token.sub && session.user) {
        // session.user の存在も確認
        try {
          const userRef = users.doc(token.sub);
          const userSnap = await userRef.get(); // スナップショットを取得

          if (userSnap.exists) {
            const userData = userSnap.data() as UserData; // 型アサーション
            // セッションユーザー情報を Firestore のデータで更新
            session.user.id = token.sub;
            session.user.displayName = userData.displayName;
            session.user.avatarUrl = userData.avatarUrl;
            session.user.role = userData.role;
            // email は token に含まれる可能性があるため、ここでは上書きしない
          } else {
            console.warn(
              `User data not found in Firestore for id: ${token.sub}`,
            );
            // Firestoreにデータがない場合、セッションから関連情報を削除するか検討
            // 例: session.user = undefined; または特定のフィールドをnullにする
          }
        } catch (error) {
          console.error("Error fetching user data for session:", error);
          // エラー発生時もセッションを返す（部分的な情報でも）か、エラーを示す値を返すか検討
        }
      }
      return session; // 更新されたセッションを返す
    },
    /**
     * JWT が作成または更新されるたびに呼び出されます。
     * Discord のアクセストークンを JWT に含めます。
     * @param params - jwt コールバックのパラメータ。
     * @param params.token - 現在の JWT トークン。
     * @param params.account - プロバイダーのアカウント情報（ログイン時のみ）。
     * @returns 更新された JWT トークン。
     */
    async jwt({ token, account }) {
      if (account?.provider === "discord") {
        // プロバイダーを明示的に確認
        token.accessToken = account.access_token;
        // 必要であれば他のアカウント情報もトークンに追加
        // token.userId = account.providerAccountId; // 例: Discord ID
      }
      // token.sub は NextAuth が自動でユーザーIDを設定する
      return token;
    },
  },
  // debug は開発環境のランタイム時のみ true にする
  debug: process.env.NODE_ENV === "development" && !isBuildTime(),
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
    // newUser: '/auth/new-user', // Example: Redirect new users
    // verifyRequest: '/auth/verify-request', // Example: Email verification page
    // signOut: '/auth/signout', // Example: Custom sign out page
    // 注意: `signIn` コールバックでリダイレクトする場合、`pages` の設定は直接使われません
  },
};

// NextAuth の設定とハンドラーのエクスポート
export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth(authConfig); // 設定オブジェクトを渡す

/**
 * NextAuth の型定義を拡張し、アプリケーション固有のユーザー情報をセッションと JWT に含めます。
 */
declare module "next-auth" {
  /**
   * `useSession` や `auth()` から返される Session オブジェクトの型。
   */
  interface Session {
    user: {
      id: string;
      displayName: string;
      avatarUrl: string;
      role: string;
      /** Discord から取得したメールアドレス (存在する場合) */
      email?: string | null;
      /** NextAuth デフォルトの name と image はオプション */
      name?: string | null;
      image?: string | null;
    };
  }

  /**
   * `getToken` から返される、または `session` コールバックの引数として使用される JWT の型。
   */
  interface JWT {
    /** Discord のアクセストークン */
    accessToken?: string;
    // 他のカスタムクレームを追加可能
    // userId?: string;
  }
}
