/**
 * Discord認証関連のユーティリティ関数
 */

/**
 * Discord アバターURLを生成する
 *
 * アバターハッシュの先頭が "a_" で始まる場合は GIF フォーマット、
 * それ以外は PNG フォーマットの URL を生成する
 *
 * @param userId - Discord ユーザーID
 * @param avatarHash - アバターのハッシュ値（null または空文字の場合は undefined を返却）
 * @returns アバターのURL または undefined（アバターハッシュがない場合）
 */
export function getDiscordAvatarUrl(
  userId: string,
  avatarHash: string | null,
): string | undefined {
  if (!avatarHash) return undefined;
  const format = avatarHash.startsWith("a_") ? "gif" : "png";
  return `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.${format}?size=128`;
}

/**
 * 環境変数の検証
 * 
 * 必要な環境変数が設定されているかを確認し、
 * 不足している場合はエラーをスローする
 * 
 * @throws {Error} 環境変数が不足している場合
 */
export function validateEnvironmentVariables(): {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  targetGuildId: string;
} {
  // フロントエンドとバックエンドで共有する環境変数はNEXT_PUBLIC_プレフィックスを使用
  const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;
  const redirectUri = process.env.NEXT_PUBLIC_DISCORD_REDIRECT_URI;
  
  // サーバーサイドのみで使用する機密情報の環境変数
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  const targetGuildId = process.env.DISCORD_TARGET_GUILD_ID;

  if (!clientId || !clientSecret || !redirectUri || !targetGuildId) {
    const missingVars = [
      !clientId && "NEXT_PUBLIC_DISCORD_CLIENT_ID",
      !clientSecret && "DISCORD_CLIENT_SECRET",
      !redirectUri && "NEXT_PUBLIC_DISCORD_REDIRECT_URI",
      !targetGuildId && "DISCORD_TARGET_GUILD_ID",
    ].filter(Boolean);

    throw new Error(`Discord設定が不足しています: ${missingVars.join(", ")}`);
  }

  return {
    clientId,
    clientSecret,
    redirectUri,
    targetGuildId,
  };
}