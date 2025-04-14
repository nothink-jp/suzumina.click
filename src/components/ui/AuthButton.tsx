"use client";

import { useAuth } from "@/lib/firebase/AuthProvider"; // 作成した useAuth フックをインポート
import { auth } from "@/lib/firebase/client"; // Firebase auth インスタンス
import { signOut } from "firebase/auth";
import { useRouter } from 'next/navigation'; // App Router 用の useRouter

export default function AuthButton() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const handleLogin = () => {
    // TODO: 環境変数から Discord Client ID と Redirect URI を取得
    const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;
    // コールバック先は Cloud Functions ではなく、フロントエンドの専用ページにするのが一般的
    // 例: http://localhost:3000/auth/discord/callback
    const redirectUri = process.env.NEXT_PUBLIC_DISCORD_REDIRECT_URI;

    if (!clientId || !redirectUri) {
      console.error("Discord OAuth environment variables are not set.");
      // TODO: ユーザーにエラーを通知
      return;
    }

    // Discord 認証 URL を生成
    const scope = "identify guilds email"; // email スコープを追加
    const discordAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}`;

    // Discord 認証ページへリダイレクト
    window.location.href = discordAuthUrl;
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      // ログアウト後、必要に応じてトップページなどにリダイレクト
      router.push('/');
      console.log("Logged out successfully");
    } catch (error) {
      console.error("Error signing out: ", error);
      // TODO: ユーザーにエラーを通知
    }
  };

  if (loading) {
    // 認証状態読み込み中はスピナーなどを表示 (DaisyUI spinner)
    // Biome のルールに従い自己終了タグに変更
    return <span className="loading loading-spinner loading-sm" />;
  }

  if (user) {
    // ログイン済みの場合: ユーザー名とログアウトボタン
    return (
      <div className="flex items-center gap-2">
        {/* Firebase Auth の displayName を表示 */}
        <span className="text-sm hidden sm:inline">{user.displayName || user.uid}</span>
        <button type="button" onClick={handleLogout} className="btn btn-ghost btn-sm">
          ログアウト
        </button>
      </div>
    );
  }

  // 未ログインの場合: ログインボタン
  return (
    <button type="button" onClick={handleLogin} className="btn btn-primary btn-sm">
      Discord でログイン
    </button>
  );
}