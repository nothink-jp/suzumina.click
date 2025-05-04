"use client";

import { revokeSession } from "@/app/actions/auth/revokeSession";
import { useAuth } from "@/lib/firebase/AuthProvider";
import { auth } from "@/lib/firebase/client";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";

export default function AuthButton() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Discord認証画面へリダイレクトする関数
  const handleLogin = () => {
    // Discord OAuth2認証ページのURL
    const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;
    const redirectUri = encodeURIComponent(
      process.env.NEXT_PUBLIC_DISCORD_REDIRECT_URI ||
        `${window.location.origin}/auth/discord/callback`,
    );

    // Discord OAuth2に必要なスコープ
    const scope = encodeURIComponent("identify guilds email");

    // Discord OAuth2認証ページへリダイレクト
    const authUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`;
    window.location.href = authUrl;
  };

  // ログアウト処理を行う関数
  const handleLogout = async () => {
    try {
      // authがnullでないことを確認してからsignOutを呼び出す
      if (auth) {
        // まずFirebaseからサインアウト
        await signOut(auth);

        // サーバー側のセッションクッキーも削除
        await revokeSession();

        router.push("/");
        console.log("ログアウトに成功しました");
      } else {
        console.error("Firebase認証が初期化されていません");
      }
    } catch (error) {
      console.error("ログアウト中にエラーが発生しました:", error);
    }
  };

  if (loading) {
    // ローディング中はスピナーを表示 - アクセシビリティのためのrole属性を追加
    return (
      <span
        className="loading loading-spinner loading-sm"
        role="status"
        data-testid="loading-spinner"
      />
    );
  }

  if (user) {
    // ログイン済みの場合: Avatar と Dropdown メニュー
    return (
      <div className="dropdown dropdown-end">
        {/* トリガー要素を button に変更 */}
        <button
          type="button"
          tabIndex={0}
          className="btn btn-ghost btn-circle avatar"
        >
          <div className="w-10 rounded-full">
            <img
              src={user.photoURL || "https://placehold.jp/150x150.png"}
              alt="プロフィール画像"
              width={40}
              height={40}
            />
          </div>
        </button>
        <ul className="mt-3 z-[1] p-2 shadow menu menu-sm dropdown-content bg-base-100 rounded-box w-52">
          <li className="menu-title px-2 py-2">
            <span className="text-sm font-medium">
              {user.displayName || user.uid.substring(0, 8)}
            </span>
          </li>
          <li>
            <a href="/profile">プロフィール</a>
          </li>
          <li>
            <a href="/settings">設定</a>
          </li>
          <li>
            <button type="button" onClick={handleLogout}>
              ログアウト
            </button>
          </li>
        </ul>
      </div>
    );
  }

  // 未ログインの場合: ログインボタンを表示
  return (
    <button
      type="button"
      className="btn btn-primary btn-sm"
      onClick={handleLogin}
    >
      Discordでログイン
    </button>
  );
}
