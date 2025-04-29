import Link from "next/link";
import type { UserProfile } from "@/lib/users/types";

/**
 * ユーザーのログイン状態を表示するコンポーネント
 */
export interface UserStatusCardProps {
  /** ログインしているユーザー情報（nullの場合は非ログイン状態） */
  user: UserProfile | null;
}

export default function UserStatusCard({ user }: UserStatusCardProps) {
  const isLoggedIn = !!user;

  return (
    <div className="card bg-base-200 shadow-sm">
      <div className="card-body p-4 md:p-6">
        <h2 className="card-title text-lg">
          {isLoggedIn ? "ログイン中" : "ログインしていません"}
        </h2>

        {isLoggedIn ? (
          <div className="space-y-2">
            {user.photoURL && (
              <div className="avatar">
                <div className="w-12 rounded-full">
                  <img
                    src={user.photoURL}
                    alt={`${user.preferredName}のアバター`}
                  />
                </div>
              </div>
            )}
            <p>
              ユーザー名:{" "}
              <span className="font-medium">
                {user.preferredName}
              </span>
            </p>
            {user.bio && (
              <p className="text-sm italic overflow-hidden text-ellipsis">
                "{user.bio.length > 50 ? `${user.bio.substring(0, 50)}...` : user.bio}"
              </p>
            )}
            <div className="card-actions justify-end mt-2">
              <Link href="/profile" className="btn btn-sm btn-primary">
                プロフィール
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm">
              機能をすべて利用するにはログインしてください
            </p>
            <div className="card-actions justify-end mt-2">
              <Link href="/auth" className="btn btn-sm btn-primary">
                ログイン
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
