import type { FrontendDLsiteWorkData } from "@suzumina.click/shared-types/src/work";
import { Badge } from "@suzumina.click/ui/components/badge";
import { Button } from "@suzumina.click/ui/components/button";
import { Calendar, ExternalLink, Star, Tag, TrendingUp } from "lucide-react";
import Link from "next/link";
import ThumbnailImage from "@/components/ThumbnailImage";

interface WorkCardProps {
  work: FrontendDLsiteWorkData;
  variant?: "default" | "compact";
  priority?: boolean; // LCP画像最適化用
}

export default function WorkCard({
  work,
  variant = "default",
  priority = false,
}: WorkCardProps) {
  const renderStars = (rating: number) => {
    return (
      <div
        className="flex items-center"
        role="img"
        aria-label={`${rating}つ星の評価`}
      >
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${star <= rating ? "text-foreground fill-current" : "text-muted-foreground"}`}
            aria-hidden="true"
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
    <article
      className="hover:shadow-lg transition-shadow border bg-card text-card-foreground rounded-lg shadow-sm"
      aria-labelledby={`work-title-${work.id}`}
    >
      <div className="p-0">
        <div className="relative">
          <div className="aspect-[4/3] overflow-hidden rounded-t-lg">
            <a
              href={work.workUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full h-full group"
              aria-label={`${work.title}をDLsiteで開く`}
            >
              <ThumbnailImage
                src={work.thumbnailUrl}
                alt={`${work.title}のサムネイル画像`}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                priority={priority}
                width={384}
                height={288}
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
              />
            </a>
          </div>
          {/* セール中バッジ */}
          {isOnSale && (
            <div className="absolute top-2 left-2">
              <Badge
                className="bg-destructive text-white"
                aria-label="セール中の商品"
              >
                セール中
              </Badge>
            </div>
          )}
          {/* ランキングバッジ */}
          {latestRank && (
            <div className="absolute top-2 right-2">
              <Badge
                className="bg-background text-white"
                aria-label={`ランキング${latestRank}位`}
              >
                #{latestRank}位
              </Badge>
            </div>
          )}
        </div>
        <div className="p-3 sm:p-4">
          <a
            href={work.workUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block group"
            aria-label={`${work.title}をDLsiteで開く`}
          >
            <h4
              id={`work-title-${work.id}`}
              className={`font-semibold mb-1 line-clamp-2 group-hover:text-foreground/80 transition-colors text-foreground ${
                isCompact ? "text-sm sm:text-base" : "text-xs sm:text-sm"
              }`}
            >
              {work.title}
            </h4>
          </a>
          <p className="text-xs sm:text-sm text-muted-foreground mb-2">
            {work.circle}
          </p>

          {/* タグ表示 */}
          <ul className="flex flex-wrap gap-1 mb-2" aria-label="作品タグ">
            {work.tags.slice(0, 3).map((tag) => (
              <li key={tag}>
                <Badge
                  variant="outline"
                  className="text-xs border text-muted-foreground flex items-center gap-1"
                >
                  <Tag className="h-3 w-3" aria-hidden="true" />
                  {tag}
                </Badge>
              </li>
            ))}
          </ul>

          {/* 発売日・販売数 */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0 text-xs sm:text-sm mb-2">
            <div className="flex items-center">
              <Calendar
                className="h-4 w-4 text-muted-foreground mr-1"
                aria-hidden="true"
              />
              <time
                dateTime={work.registDate}
                aria-label={`発売日: ${work.registDate ? formatDate(work.registDate) : "不明"}`}
              >
                <span className="text-foreground">
                  {work.registDate ? formatDate(work.registDate) : "不明"}
                </span>
              </time>
            </div>
            {work.salesCount && (
              <div className="flex items-center">
                <TrendingUp
                  className="h-4 w-4 mr-1 text-muted-foreground"
                  aria-hidden="true"
                />
                <span
                  className="text-foreground"
                  aria-label={`販売数: ${work.salesCount.toLocaleString()}件`}
                >
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
                      <span className="text-base sm:text-lg font-bold text-destructive">
                        ¥{currentPrice.toLocaleString()}
                      </span>
                      <span className="text-xs sm:text-sm text-muted-foreground line-through">
                        ¥{originalPrice.toLocaleString()}
                      </span>
                      <Badge className="bg-destructive/10 text-destructive text-xs">
                        {work.price.discount}% OFF
                      </Badge>
                    </div>
                  ) : (
                    <span className="text-base sm:text-lg font-bold text-foreground">
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
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <span className="text-muted-foreground">評価:</span>
                <div className="flex items-center gap-1">
                  {renderStars(work.rating.stars)}
                  <span className="text-foreground font-medium ml-1">
                    {work.rating.stars.toFixed(1)}
                  </span>
                  <span className="text-muted-foreground">
                    ({work.rating.count})
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* アクションボタン */}
          <fieldset className="flex gap-2" aria-label="作品アクション">
            <Button
              size="sm"
              variant="outline"
              className="flex-1 border text-muted-foreground hover:bg-accent min-h-[44px] text-xs sm:text-sm"
              asChild
            >
              <Link
                href={`/works/${work.id}`}
                aria-describedby={`work-title-${work.id}`}
              >
                詳細{isCompact ? "を見る" : ""}
              </Link>
            </Button>
            <Button
              size="sm"
              className="bg-destructive hover:bg-destructive/90 text-white min-h-[44px] min-w-[44px] px-3"
              asChild
            >
              <a
                href={work.workUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${work.title}をDLsiteで購入`}
              >
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
              </a>
            </Button>
          </fieldset>
        </div>
      </div>
    </article>
  );
}
