"use client";

import { useAuth } from "@/lib/firebase/AuthProvider";
import AuthButton from "@/components/ui/AuthButton";

export default function ProfilePage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="bg-base-100">
        <div className="container mx-auto px-4 py-8">
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <p>読み込み中...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="bg-base-100">
        <div className="container mx-auto px-4 py-8">
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">ログインが必要です</h2>
              <p>プロフィール情報を表示するにはログインしてください。</p>
              <div className="card-actions justify-end mt-4">
                <AuthButton />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-base-100">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">プロフィール</h1>
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <div className="flex items-center gap-4">
              {user.photoURL && (
                <img
                  src={user.photoURL}
                  alt={`${user.displayName}のアバター`}
                  className="w-24 h-24 rounded-full"
                />
              )}
              <div>
                <h2 className="card-title">{user.displayName}</h2>
                <p className="text-sm text-gray-500">Discord ID: {user.email?.split("@")[0]}</p>
              </div>
            </div>
            <div className="divider" />
            <div>
              <h3 className="font-bold mb-2">アカウント情報</h3>
              <ul className="list-disc list-inside space-y-1">
                <li>認証プロバイダー: Discord</li>
                <li>認証日時: {new Date(user.metadata.creationTime || "").toLocaleString("ja-JP")}</li>
                <li>最終ログイン: {new Date(user.metadata.lastSignInTime || "").toLocaleString("ja-JP")}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
