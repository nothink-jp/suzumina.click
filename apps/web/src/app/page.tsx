import Hero from "@/components/ui/Hero";
import VideoCarousel from "@/components/videos/VideoCarousel";

/**
 * このページを動的レンダリングするための設定
 * cookiesなどの動的サーバー機能を使用するため必要
 */
export const dynamic = "force-dynamic";

export default async function Home() {
  return (
    <main className="container mx-auto px-4 py-8">
      {/* ヒーローセクション */}
      <Hero
        title="すずみなくりっく！"
        subtitle="ようこそ！ここは涼花みなせさんの活動を応援する非公式ファンサイトです。"
        alignment="center"
      />

      {/* メインコンテンツエリア */}
      <div className="mt-8">
        {/* 動画カルーセル（最新10件を表示） */}
        <VideoCarousel limit={10} />
      </div>
    </main>
  );
}
