import { Button } from "@suzumina.click/ui/components/button";
import Link from "next/link";
import { FeaturedVideosCarousel } from "@/components/FeaturedVideosCarousel";
import { FeaturedWorksCarousel } from "@/components/FeaturedWorksCarousel";
import SearchForm from "@/components/SearchForm";
import { getLatestVideos, getLatestWorks } from "./actions";

// Server Component として実装し、LCPを改善
export default async function Home() {
  // 新着作品と動画を並行取得
  const [latestWorks, latestVideos] = await Promise.all([
    getLatestWorks(10),
    getLatestVideos(10),
  ]);
  return (
    <div>
      {/* メインビジュアル - LCP最適化済み */}
      <section className="py-20 text-center">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            {/* LCP要素として最適化 - 明示的サイズとフォント最適化 */}
            <h1
              className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-6"
              style={{
                // LCP改善: 明示的なサイズとレイアウト
                minHeight: "3rem",
                contentVisibility: "visible",
              }}
            >
              すずみなくりっく！
            </h1>
            <p
              className="text-lg sm:text-xl text-muted-foreground mb-8"
              style={{
                // CLS防止: 明示的な高さ
                minHeight: "2rem",
              }}
            >
              お気に入りの音声ボタンを作成・共有し、最新の作品情報をチェックしよう
            </p>
            {/* 検索フォームをClient Componentに分離 */}
            <SearchForm />
          </div>
        </div>
      </section>

      {/* 新着作品一覧 */}
      <section className="py-12 bg-white/50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-2xl sm:text-3xl font-bold text-foreground">
              🎧 新着作品
            </h3>
            <Button variant="outline" asChild className="min-h-[44px]">
              <Link href="/works">すべて見る</Link>
            </Button>
          </div>

          <FeaturedWorksCarousel works={latestWorks} />
        </div>
      </section>

      {/* 新着動画一覧 */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-2xl sm:text-3xl font-bold text-foreground">
              📺 新着動画
            </h3>
            <Button variant="outline" asChild className="min-h-[44px]">
              <Link href="/videos">すべて見る</Link>
            </Button>
          </div>

          <FeaturedVideosCarousel videos={latestVideos} />
        </div>
      </section>

      {/* 新着ボイスボタン（開発予定） */}
      <section className="py-12 bg-white/50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-2xl sm:text-3xl font-bold text-foreground">
              🎵 新着ボイスボタン
            </h3>
            <Button variant="outline" asChild className="min-h-[44px]">
              <Link href="/buttons">すべて見る</Link>
            </Button>
          </div>

          {/* プレースホルダー：音声ボタン（開発予定） */}
          <div className="flex flex-wrap gap-3 justify-center items-start min-h-[240px]">
            <div className="p-6 bg-muted border rounded-lg">
              <h4 className="text-lg font-medium text-foreground mb-2">
                音声ボタン機能
              </h4>
              <p className="text-muted-foreground">開発予定の機能です</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
