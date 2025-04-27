import VideoList from "./_components/VideoList";
import { getCurrentUser } from "./api/auth/getCurrentUser";

/**
 * このページを動的レンダリングするための設定
 * cookiesなどの動的サーバー機能を使用するため必要
 */
export const dynamic = "force-dynamic";

export default async function Home() {
  // サーバーサイドでログイン状態を確認
  const user = await getCurrentUser();
  const isLoggedIn = !!user;

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">すずみなくりっく！</h1>
        <p className="text-lg">
          ようこそ！ここは涼花みなせさんの活動を応援する非公式ファンサイトです。
        </p>

        {/* ログイン状態に応じた表示 */}
        <div className="mt-4">
          {isLoggedIn ? (
            <div className="mt-4 p-4 bg-base-200 rounded-lg inline-block">
              <p>ログイン中です</p>
              <p>ユーザー名: {user?.displayName}</p>
            </div>
          ) : (
            <div className="mt-4">
              <p>未ログイン</p>
            </div>
          )}
        </div>
      </div>

      {/* 動画一覧（最新4件のみ表示） */}
      <VideoList limit={4} showViewAllLink={true} />
    </main>
  );
}
