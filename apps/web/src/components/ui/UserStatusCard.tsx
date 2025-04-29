"use client";

import { useAuth } from "@/lib/firebase/AuthProvider";
import { auth } from "@/lib/firebase/client";
import type { UserProfile } from "@/lib/users/types";
import { signOut } from "firebase/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";

/**
 * ユーザーのログイン状態を表示するコンポーネント
 */
export interface UserStatusCardProps {
  /** ログインしているユーザー情報（nullの場合は非ログイン状態） */
  user: UserProfile | null;
}

export default function UserStatusCard({ user }: UserStatusCardProps) {
  const isLoggedIn = !!user;
  const router = useRouter();

  // Discord認証用のログイン処理
  const handleLogin = () => {
    const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;
    const redirectUri = process.env.NEXT_PUBLIC_DISCORD_REDIRECT_URI;

    if (!clientId || !redirectUri) {
      console.error("Discord OAuth環境変数が設定されていません");
      return;
    }

    // 現在のページURLをローカルストレージに保存
    // ログイン後にこのURLにリダイレクトするために使用
    localStorage.setItem("auth_redirect_url", window.location.href);

    const scope = "identify guilds email";
    const discordAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}`;
    window.location.href = discordAuthUrl;
  };

  // ログアウト処理
  const handleLogout = async () => {
    try {
      if (auth) {
        await signOut(auth);
        router.push("/");
        console.log("ログアウトに成功しました");
      } else {
        console.error("Firebase認証が初期化されていません");
      }
    } catch (error) {
      console.error("ログアウト中にエラーが発生しました: ", error);
    }
  };

  return (
    <div className="card bg-base-200 shadow-sm">
      <div className="card-body p-4 md:p-6">
        <h2 className="card-title text-lg">
          {isLoggedIn ? "ログイン中です" : "ログインしていません"}
        </h2>

        {isLoggedIn ? (
          <div className="space-y-2">
            {user.photoURL && (
              <div className="avatar">
                <div className="w-12 rounded-full">
                  <img
                    src={user.photoURL}
                    alt={`${user.displayName || "未設定"}のアバター`}
                  />
                </div>
              </div>
            )}
            <p>
              ユーザー名:{" "}
              <span className="font-medium">
                {user.displayName || "未設定"}
              </span>
            </p>
            {user.bio && (
              <p className="text-sm italic overflow-hidden text-ellipsis">
                "
                {user.bio.length > 50
                  ? `${user.bio.substring(0, 50)}...`
                  : user.bio}
                "
              </p>
            )}
            <div className="card-actions justify-end mt-2">
              <Link href="/profile" className="btn btn-sm btn-primary">
                プロフィール
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="btn btn-sm btn-outline"
              >
                ログアウト
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm">
              機能をすべて利用するにはログインしてください
            </p>
            <div className="card-actions justify-end mt-2">
              <button
                type="button"
                onClick={handleLogin}
                className="btn btn-sm btn-primary"
              >
                Discordでログイン
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
