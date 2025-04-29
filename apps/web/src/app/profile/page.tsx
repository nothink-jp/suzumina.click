import AuthButton from "@/components/ui/AuthButton";
import { Suspense } from "react";
import { getProfile } from "../api/profile/getProfile";
import ProfileEditForm from "./_components/ProfileEditForm";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  // サーバーサイドでプロフィール情報を取得
  const profile = await getProfile();

  if (!profile) {
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* プロフィール情報表示カード */}
          <div className="md:col-span-1">
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <div className="flex flex-col items-center gap-4">
                  {profile.photoURL && (
                    <div className="avatar">
                      <div className="w-24 h-24 rounded-full">
                        <img
                          src={profile.photoURL}
                          alt={`${profile.preferredName}のアバター`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                  )}
                  <div className="text-center">
                    <h2 className="card-title text-center">
                      {profile.preferredName}
                      {!profile.isPublic && (
                        <span className="badge badge-secondary ml-2">
                          非公開
                        </span>
                      )}
                    </h2>
                    <p className="text-sm text-gray-500">
                      Discord表示名:{" "}
                      {profile.displayName?.split("@")[0] || "未設定"}
                    </p>
                  </div>
                </div>

                {profile.bio && (
                  <div className="mt-4">
                    <h3 className="font-bold text-sm">自己紹介</h3>
                    <p className="mt-2 text-gray-700 whitespace-pre-wrap">
                      {profile.bio}
                    </p>
                  </div>
                )}

                <div className="divider" />

                <div>
                  <h3 className="font-bold text-sm mb-2">アカウント情報</h3>
                  <ul className="list-disc list-inside space-y-1">
                    <li>認証プロバイダー: Discord</li>
                    <li>
                      認証日時:{" "}
                      {new Date(profile.createdAt).toLocaleString("ja-JP")}
                    </li>
                    <li>
                      最終更新:{" "}
                      {new Date(profile.updatedAt).toLocaleString("ja-JP")}
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* プロフィール編集フォーム */}
          <div className="md:col-span-2">
            <div className="card bg-base-100 shadow-xl">
              <div className="card-body">
                <h2 className="card-title">プロフィール編集</h2>
                <Suspense
                  fallback={<div className="loading loading-spinner" />}
                >
                  <ProfileEditForm profile={profile} />
                </Suspense>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
