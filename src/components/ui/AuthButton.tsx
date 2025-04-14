"use client";

import { useAuth } from "@/lib/firebase/AuthProvider";
import { auth } from "@/lib/firebase/client";
import { signOut } from "firebase/auth";
import { useRouter } from 'next/navigation';
// import Image from 'next/image'; // next/image は不要になったので削除

export default function AuthButton() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const handleLogin = () => {
    const clientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;
    const redirectUri = process.env.NEXT_PUBLIC_DISCORD_REDIRECT_URI;

    if (!clientId || !redirectUri) {
      console.error("Discord OAuth environment variables are not set.");
      return;
    }

    const scope = "identify guilds email";
    const discordAuthUrl = `https://discord.com/api/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}`;
    window.location.href = discordAuthUrl;
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/');
      console.log("Logged out successfully");
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  if (loading) {
    return <span className="loading loading-spinner loading-sm" />;
  }

  if (user) {
    // ログイン済みの場合: Avatar と Dropdown メニュー
    return (
      <div className="dropdown dropdown-end">
        {/* トリガー要素を button に変更 */}
        <button type="button" tabIndex={0} className="btn btn-ghost btn-circle avatar">
          <div className="w-10 rounded-full">
            {user.photoURL ? (
              // 標準の img タグを使用
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.photoURL} alt="User Avatar" />
            ) : (
              <div className="avatar placeholder">
                <div className="bg-neutral text-neutral-content rounded-full w-10">
                  <span className="text-xl">{user.displayName?.charAt(0) || '?'}</span>
                </div>
              </div>
            )}
          </div>
        </button>
        <ul
          // ul から tabIndex を削除
          className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52"
        >
          <li className="menu-title">
            <span>{user.displayName || user.uid}</span>
          </li>
          <li>
            <button type="button" onClick={handleLogout}>ログアウト</button>
          </li>
          {/* <li><a>プロフィール</a></li> */}
          {/* <li><a>設定</a></li> */}
        </ul>
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
