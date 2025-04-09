import type { Account, Profile, Session } from "next-auth";
import type { JWT } from "next-auth/jwt";
import { users } from "./firestore"; // Firestore の users コレクションをインポート
import { getRequiredEnvVar } from "./utils"; // 環境変数取得ユーティリティをインポート

/**
 * Discord プロファイルの型定義。NextAuth の Profile を拡張します。
 */
interface DiscordProfile extends Profile {
  username?: string;
  image_url?: string;
}

/**
 * NextAuth.js の認証コールバック関数群。
 * 認証フローの特定のポイントで実行され、動作をカスタマイズします。
 */
export const callbacks = {
  /**
   * サインイン試行時に呼び出されます。
   * Discord 認証の場合、ユーザーが指定された Discord ギルドのメンバーであるかを確認し、
   * Firestore にユーザー情報を保存または更新します。
   * @param params - signIn コールバックのパラメータ。
   * @param params.account - プロバイダーのアカウント情報 (Discord)。
   * @param params.profile - Discord から取得したユーザープロファイル。
   * @returns 認証を許可する場合は true、拒否する場合は false。
   */
  async signIn({
    account,
    profile,
  }: {
    account: Account | null;
    profile?: DiscordProfile;
  }): Promise<boolean> {
    // Return type changed back to boolean
    // アカウント情報とプロバイダーが正しいか検証
    if (!account?.access_token || account.provider !== "discord") {
      console.error("Invalid account data for Discord sign in.");
      return false;
    }
    // プロファイル ID が存在するか検証
    if (!profile?.id) {
      console.error("Invalid profile data from Discord.");
      return false;
    }

    try {
      // Discord API を使用してユーザーが所属するギルドリストを取得
      const response = await fetch("https://discord.com/api/users/@me/guilds", {
        headers: {
          Authorization: `Bearer ${account.access_token}`,
        },
      });

      if (!response.ok) {
        console.error(
          "Failed to fetch Discord guild data:",
          await response.text(),
        );
        return false; // API リクエスト失敗
      }

      const guilds = await response.json();
      let guildId: string;
      try {
        // 必須のギルド ID を環境変数から取得
        guildId = getRequiredEnvVar("DISCORD_GUILD_ID");
      } catch (configError) {
        console.error(
          "Required Discord Guild ID is not configured.",
          configError,
        );
        return false; // 設定エラー
      }

      // ユーザーが必須ギルドのメンバーであるかを確認
      const isMember = guilds.some(
        (guild: { id: string }) => guild.id === guildId,
      );

      if (!isMember) {
        console.error(`User is not a member of the required guild: ${guildId}`);
        return false; // ギルドメンバーでない場合は認証失敗
      }

      // Firestore のユーザー参照を取得
      const userRef = users.doc(profile.id);
      const now = new Date();
      // Firestore に保存/更新するユーザーデータを作成
      const userData = {
        id: profile.id,
        displayName: profile.username ?? `User_${profile.id.substring(0, 5)}`, // フォールバック名
        avatarUrl: profile.image_url ?? "", // デフォルトアバターURLなど設定可能
        role: "member", // デフォルトロール
        updatedAt: now,
        // 新規作成時のみ createdAt を設定
      };

      // Firestore にユーザーデータをセット（存在しない場合は作成、存在する場合はマージ）
      // 注意: set({}, { merge: true }) は createdAt を上書きしないように注意が必要
      // ここでは単純化のため、常に全フィールドをセット（または update を使用）
      const userDoc = await userRef.get();
      if (!userDoc.exists) {
        await userRef.set({ ...userData, createdAt: now });
      } else {
        await userRef.update({
          // 既存ユーザーは更新
          displayName: userData.displayName,
          avatarUrl: userData.avatarUrl,
          updatedAt: now,
        });
      }

      return true; // Return true on success, let NextAuth handle redirect
    } catch (error) {
      console.error("Error during sign in callback:", error);
      return false; // その他のエラーが発生した場合も認証失敗
    }
  },

  /**
   * セッションがチェックされるたびに呼び出されます。
   * JWT トークンに含まれるユーザー ID を使用して Firestore から最新のユーザー情報を取得し、
   * セッションオブジェクトにマージします。
   * @param params - session コールバックのパラメータ。
   * @param params.session - 現在のセッションオブジェクト。
   * @param params.token - JWT トークン。
   * @returns 更新されたセッションオブジェクト。
   */
  async session({
    session,
    token,
  }: {
    session: Session;
    token: JWT;
  }): Promise<Session> {
    // トークンにユーザーID (sub) がなければ元のセッションを返す
    if (!token.sub) {
      return session;
    }

    try {
      // Firestore からユーザーデータを取得
      const userDoc = await users.doc(token.sub).get();
      // ドキュメントが存在しない、またはデータがない場合は元のセッションを返す
      if (!userDoc.exists) {
        console.warn(
          `User data not found in Firestore for session token sub: ${token.sub}`,
        );
        return session;
      }
      const userData = userDoc.data();
      if (!userData) {
        console.warn(
          `User data is empty in Firestore for session token sub: ${token.sub}`,
        );
        return session;
      }

      // セッションの user オブジェクトに必要な情報を追加・更新
      // session.user が存在することを保証 (NextAuth v5 の型変更に対応)
      if (!session.user) {
        // <<< 修正: 必須プロパティを含むデフォルト値を設定
        session.user = {
          id: token.sub,
          email: null,
          name: null,
          image: null,
          displayName: "取得中...", // プレースホルダー
          avatarUrl: "", // プレースホルダー
          role: "member", // デフォルトロール
        };
      }
      session.user.id = token.sub;
      session.user.displayName = userData.displayName;
      session.user.avatarUrl = userData.avatarUrl;
      session.user.role = userData.role;
      // email は token から取得されることが多いため、ここでは上書きしない

      return session; // 更新されたセッションを返す
    } catch (error) {
      console.error("Error fetching user data for session:", error);
      return session; // エラー時も元のセッションを返す（部分的な情報でも）
    }
  },

  /**
   * JWT が作成または更新されるたびに呼び出されます。
   * ログイン時に Discord から取得したアクセストークンを JWT に含めます。
   * @param params - jwt コールバックのパラメータ。
   * @param params.token - 現在の JWT トークン。
   * @param params.account - プロバイダーのアカウント情報（ログイン時のみ）。
   * @returns 更新された JWT トークン。
   */
  async jwt({
    token,
    account,
  }: {
    token: JWT;
    account: Account | null;
  }): Promise<JWT> {
    // ログイン時 (account が存在する) かつ Discord プロバイダーの場合
    if (account?.provider === "discord") {
      token.accessToken = account.access_token; // アクセストークンを JWT に追加
      // 必要に応じて他の情報 (例: Discord ID) をトークンに追加可能
      // token.discordId = account.providerAccountId;
    }
    // token.sub は NextAuth が自動でユーザーID (profile.id) を設定
    return token; // 更新されたトークンを返す
  },
};
