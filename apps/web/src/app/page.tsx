import { getProfile } from "@/actions/profile/getProfile";
import Hero from "@/components/ui/Hero";
import UserStatusCard from "@/components/ui/UserStatusCard";
import VideoList from "./_components/VideoList";

/**
 * このページを動的レンダリングするための設定
 * cookiesなどの動的サーバー機能を使用するため必要
 */
export const dynamic = "force-dynamic";

export default async function Home() {
  // サーバーサイドでログイン状態とプロフィール情報を確認
  const userProfile = await getProfile();

  return (
    <main className="container mx-auto px-4 py-8">
      {/* ヒーローセクション */}
      <Hero
        title="すずみなくりっく！"
        subtitle="ようこそ！ここは涼花みなせさんの活動を応援する非公式ファンサイトです。"
        alignment="center"
      />

      {/* メインコンテンツ：サイドバーとビデオリスト */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* サイドバー */}
        <div className="lg:col-span-1 space-y-6">
          {/* ユーザー状態カード */}
          <UserStatusCard user={userProfile} />

          {/* 他のサイドバーコンテンツをここに追加可能 */}
          <div className="card bg-base-200 shadow-sm">
            <div className="card-body p-4 md:p-6">
              <h2 className="card-title text-lg">お知らせ</h2>
              <p className="text-sm">最新情報はこちらでチェック！</p>
            </div>
          </div>
        </div>

        {/* メインコンテンツエリア */}
        <div className="lg:col-span-3">
          {/* 動画一覧（最新4件のみ表示） */}
          <VideoList limit={4} showViewAllLink={true} />
        </div>
      </div>
    </main>
  );
}
