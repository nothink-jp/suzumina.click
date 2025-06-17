"use client";

import ThumbnailImage from "@/components/ThumbnailImage";
import type { FrontendDLsiteWorkData } from "@suzumina.click/shared-types/src/work";
import { Badge } from "@suzumina.click/ui/components/badge";
import { Button } from "@suzumina.click/ui/components/button";
import {
  Calendar,
  ExternalLink,
  Share2,
  ShoppingCart,
  Star,
  Tag,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";

interface WorkDetailProps {
  work: FrontendDLsiteWorkData;
}

export default function WorkDetail({ work }: WorkDetailProps) {
  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-5 w-5 ${star <= rating ? "text-rose-400 fill-current" : "text-gray-300"}`}
          />
        ))}
      </div>
    );
  };

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
        month: "long",
        day: "numeric",
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

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: work.title,
        text: work.description,
        url: window.location.href,
      });
    } else {
      // フォールバック: URLをクリップボードにコピー
      navigator.clipboard.writeText(window.location.href);
      alert("URLをクリップボードにコピーしました");
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* パンくずリスト */}
      <nav className="mb-6 text-sm">
        <ol className="flex items-center space-x-2 text-gray-600">
          <li>
            <Link href="/" className="hover:text-suzuka-600">
              ホーム
            </Link>
          </li>
          <li>
            <span className="mx-2">/</span>
          </li>
          <li>
            <Link href="/works" className="hover:text-suzuka-600">
              作品一覧
            </Link>
          </li>
          <li>
            <span className="mx-2">/</span>
          </li>
          <li className="text-gray-800 font-medium truncate">{work.title}</li>
        </ol>
      </nav>

      {/* メインコンテンツ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 左側: 作品画像と基本情報 */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {/* 作品画像 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
              <div className="space-y-4">
                <div className="relative">
                  <ThumbnailImage
                    src={work.thumbnailUrl}
                    alt={work.title}
                    className="w-full h-80 object-cover rounded-lg"
                  />
                  {isOnSale && (
                    <div className="absolute top-2 left-2">
                      <Badge className="bg-rose-500 text-white">セール中</Badge>
                    </div>
                  )}
                  {latestRank && (
                    <div className="absolute top-2 right-2">
                      <Badge className="bg-suzuka-500 text-white">
                        #{latestRank}位
                      </Badge>
                    </div>
                  )}
                </div>
              </div>

              {/* 作品情報 */}
              <div className="space-y-4">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    {work.title}
                  </h1>
                  <p className="text-gray-700">サークル: {work.circle}</p>
                </div>

                {/* 価格 */}
                <div className="space-y-2">
                  {isOnSale && originalPrice ? (
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-bold text-rose-600">
                        ¥{currentPrice.toLocaleString()}
                      </span>
                      <span className="text-lg text-gray-600 line-through">
                        ¥{originalPrice.toLocaleString()}
                      </span>
                      <Badge className="bg-rose-100 text-rose-700">
                        {work.price.discount}% OFF
                      </Badge>
                    </div>
                  ) : (
                    <span className="text-2xl font-bold text-gray-900">
                      ¥{currentPrice.toLocaleString()}
                    </span>
                  )}
                </div>

                {/* 評価 */}
                {work.rating && (
                  <div className="flex items-center gap-3">
                    {renderStars(work.rating.stars)}
                    <span className="text-lg font-semibold text-gray-900">
                      {work.rating.stars.toFixed(1)}
                    </span>
                    <span className="text-sm text-gray-600">
                      ({work.rating.count}件の評価)
                    </span>
                  </div>
                )}

                {/* 統計 */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {work.salesCount && (
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-suzuka-500" />
                      <span className="text-gray-700">販売数:</span>
                      <span className="font-medium text-gray-900">
                        {work.salesCount.toLocaleString()}
                      </span>
                    </div>
                  )}
                  {work.registDate && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-suzuka-500" />
                      <span className="text-gray-700">発売日:</span>
                      <span className="font-medium text-gray-900">
                        {formatDate(work.registDate)}
                      </span>
                    </div>
                  )}
                </div>

                {/* タグ */}
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {work.tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="outline"
                        className="border-suzuka-400 text-suzuka-700 flex items-center gap-1"
                      >
                        <Tag className="h-3 w-3" />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* アクションボタン */}
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      className="flex-1 border-suzuka-400 text-suzuka-700 hover:bg-suzuka-50"
                      onClick={handleShare}
                    >
                      <Share2 className="h-4 w-4 mr-2" />
                      共有
                    </Button>
                    <Button
                      className="flex-1 bg-rose-500 hover:bg-rose-600 text-white"
                      asChild
                    >
                      <a
                        href={work.workUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        DLsiteで購入
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* 作品説明 */}
            {work.description && (
              <div className="p-6 border-t border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900 mb-3">
                  作品説明
                </h2>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-700 whitespace-pre-line leading-relaxed">
                    {work.description}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 右側: サイドバー */}
        <div className="space-y-6">
          {/* サークル情報 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              サークル情報
            </h3>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-suzuka-100 rounded-full flex items-center justify-center">
                <span className="text-suzuka-700 font-bold text-lg">
                  {work.circle.charAt(0)}
                </span>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">{work.circle}</p>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full border-suzuka-400 text-suzuka-700 hover:bg-suzuka-50"
              disabled
            >
              他の作品を見る（準備中）
            </Button>
          </div>

          {/* 声優情報 */}
          {work.author && work.author.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                出演声優
              </h3>
              <div className="space-y-3">
                {work.author.map((actor) => (
                  <div key={actor} className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-suzuka-100 rounded-full flex items-center justify-center">
                      <span className="text-suzuka-700 font-bold text-sm">
                        {actor.charAt(0)}
                      </span>
                    </div>
                    <span className="text-gray-900">{actor}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 技術仕様 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              技術仕様
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-700">作品ID:</span>
                <span className="text-gray-900 font-mono">
                  {work.productId}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">カテゴリ:</span>
                <span className="text-gray-900">{work.category}</span>
              </div>
              {work.ageRating && (
                <div className="flex justify-between">
                  <span className="text-gray-700">年齢制限:</span>
                  <span className="text-gray-900">{work.ageRating}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
