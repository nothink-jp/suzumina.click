import ThumbnailImage from "@/components/ThumbnailImage";
import type { FrontendDLsiteWorkData } from "@suzumina.click/shared-types/src/work";
import { Badge } from "@suzumina.click/ui/components/badge";
import { Button } from "@suzumina.click/ui/components/button";
import { Calendar, ExternalLink, Star, Tag, TrendingUp } from "lucide-react";
import Link from "next/link";

interface WorkCardProps {
  work: FrontendDLsiteWorkData;
  variant?: "default" | "compact";
}

export default function WorkCard({ work, variant = "default" }: WorkCardProps) {
  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${star <= rating ? "text-rose-400 fill-current" : "text-gray-300"}`}
          />
        ))}
      </div>
    );
  };

  const isCompact = variant === "compact";

  // 価格表示の計算
  const currentPrice = work.price.current;
  const originalPrice = work.price.original;
  const isOnSale = work.price.discount && work.price.discount > 0;

  // 日付フォーマット
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("ja-JP", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  // ランキング情報を取得（最新のランキング）
  const latestRank =
    work.rankingHistory && work.rankingHistory.length > 0
      ? work.rankingHistory[0]?.rank
      : undefined;

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200">
      <div className="relative">
        <div className="aspect-[4/3] overflow-hidden rounded-t-lg">
          <a
            href={work.workUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full h-full group"
          >
            <ThumbnailImage
              src={work.thumbnailUrl}
              alt={work.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          </a>
        </div>
        {/* セール中バッジ */}
        {isOnSale && (
          <div className="absolute top-2 left-2">
            <Badge className="bg-rose-500 text-white">セール中</Badge>
          </div>
        )}
        {/* ランキングバッジ */}
        {latestRank && (
          <div className="absolute top-2 right-2">
            <Badge className="bg-suzuka-500 text-white">#{latestRank}位</Badge>
          </div>
        )}
      </div>
      <div className="p-4">
        <a
          href={work.workUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block group"
        >
          <h4
            className={`font-semibold mb-1 line-clamp-2 group-hover:text-suzuka-600 transition-colors text-suzuka-800 ${
              isCompact ? "text-base" : "text-sm"
            }`}
          >
            {work.title}
          </h4>
        </a>
        <p className="text-xs text-suzuka-500 mb-2">{work.circle}</p>

        {/* タグ表示 */}
        <div className="flex flex-wrap gap-1 mb-2">
          {work.tags.slice(0, 3).map((tag) => (
            <Badge
              key={tag}
              variant="outline"
              className="text-xs border-suzuka-300 text-suzuka-600 flex items-center gap-1"
            >
              <Tag className="h-3 w-3" />
              {tag}
            </Badge>
          ))}
        </div>

        {/* 発売日・販売数 */}
        <div className="flex items-center justify-between text-sm mb-2">
          <div className="flex items-center">
            <Calendar className="h-4 w-4 text-suzuka-500 mr-1" />
            <span className="text-suzuka-700">
              {work.registDate ? formatDate(work.registDate) : "不明"}
            </span>
          </div>
          {work.salesCount && (
            <div className="flex items-center">
              <TrendingUp className="h-4 w-4 mr-1 text-suzuka-500" />
              <span className="text-suzuka-700">
                {work.salesCount.toLocaleString()}
              </span>
            </div>
          )}
        </div>

        {/* 価格表示 */}
        {!isCompact && (
          <div className="mb-3">
            <div className="flex items-center justify-between">
              <div>
                {isOnSale && originalPrice ? (
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-rose-600">
                      ¥{currentPrice.toLocaleString()}
                    </span>
                    <span className="text-sm text-suzuka-500 line-through">
                      ¥{originalPrice.toLocaleString()}
                    </span>
                    <Badge className="bg-rose-100 text-rose-700 text-xs">
                      {work.price.discount}% OFF
                    </Badge>
                  </div>
                ) : (
                  <span className="text-lg font-bold text-suzuka-800">
                    ¥{currentPrice.toLocaleString()}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 評価情報 */}
        <div className="mb-3 space-y-2">
          {work.rating && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-suzuka-600">評価:</span>
              <div className="flex items-center gap-1">
                {renderStars(work.rating.stars)}
                <span className="text-suzuka-800 font-medium ml-1">
                  {work.rating.stars.toFixed(1)}
                </span>
                <span className="text-suzuka-500">({work.rating.count})</span>
              </div>
            </div>
          )}
        </div>

        {/* アクションボタン */}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 border-suzuka-300 text-suzuka-600 hover:bg-suzuka-50"
            asChild
          >
            <Link href={`/works/${work.id}`}>
              詳細{isCompact ? "を見る" : ""}
            </Link>
          </Button>
          <Button
            size="sm"
            className="bg-rose-400 hover:bg-rose-500 text-white"
            asChild
          >
            <a href={work.workUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
