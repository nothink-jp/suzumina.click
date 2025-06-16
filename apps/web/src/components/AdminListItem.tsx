import type { FrontendVideoData } from "@suzumina.click/shared-types/src/video";
import type { FrontendDLsiteWorkData } from "@suzumina.click/shared-types/src/work";
import Link from "next/link";
import ThumbnailImage from "./ThumbnailImage";

// 統一されたリストアイテムの型定義
type AdminListItemData = FrontendVideoData | FrontendDLsiteWorkData;

interface AdminListItemProps {
  item: AdminListItemData;
  type: "video" | "work";
}

// 型ガード関数
function isVideoData(item: AdminListItemData): item is FrontendVideoData {
  return "videoId" in item;
}

function isWorkData(item: AdminListItemData): item is FrontendDLsiteWorkData {
  return "productId" in item;
}

// 統一された管理画面用リストアイテムコンポーネント
export default function AdminListItem({ item, type }: AdminListItemProps) {
  // 共通データの抽出
  const commonData = {
    id: item.id,
    title: item.title,
    thumbnailUrl: isVideoData(item) ? item.thumbnailUrl : item.thumbnailUrl,
    description: isVideoData(item) ? item.description : item.description,
    updatedAt: isVideoData(item) ? item.lastFetchedAtISO : item.updatedAtISO,
  };

  // タイプ別の固有データ
  const typeSpecificData = isVideoData(item)
    ? {
        subtitle: `チャンネル: ${item.channelTitle}`,
        publishDate: new Date(item.publishedAt).toLocaleDateString("ja-JP"),
        badges: [], // 動画の場合はバッジなし
        actionUrl: `https://www.youtube.com/watch?v=${item.videoId}`,
        actionText: "YouTubeで見る",
        metadata: [
          {
            label: "公開日",
            value: new Date(item.publishedAt).toLocaleDateString("ja-JP"),
          },
          {
            label: "最終取得",
            value: new Date(item.lastFetchedAtISO).toLocaleDateString("ja-JP"),
          },
        ],
      }
    : {
        subtitle: `サークル: ${item.circle}${item.author && item.author.length > 0 ? ` | 声優: ${item.author.join(", ")}` : ""}`,
        publishDate: new Date(item.updatedAt).toLocaleDateString("ja-JP"),
        badges: [
          // 年齢制限バッジ
          ...(item.ageRating
            ? [
                {
                  text: item.ageRating.includes("18")
                    ? "R-18"
                    : item.ageRating.includes("15")
                      ? "R-15"
                      : "全年齢",
                  className: item.ageRating.includes("18")
                    ? "bg-red-100 text-red-800"
                    : item.ageRating.includes("15")
                      ? "bg-orange-100 text-orange-800"
                      : "bg-green-100 text-green-800",
                },
              ]
            : []),
          // 独占配信バッジ
          ...(item.isExclusive
            ? [
                {
                  text: "独占",
                  className: "bg-purple-100 text-purple-800",
                },
              ]
            : []),
          // 割引バッジ
          ...(item.discountText
            ? [
                {
                  text: item.discountText,
                  className: "bg-blue-100 text-blue-800",
                },
              ]
            : []),
        ],
        actionUrl: item.workUrl,
        actionText: "DLsiteで見る",
        metadata: [
          { label: "価格", value: item.displayPrice },
          ...(item.ratingText
            ? [{ label: "評価", value: item.ratingText }]
            : []),
          ...(item.downloadText
            ? [{ label: "DL数", value: item.downloadText }]
            : []),
          {
            label: "更新日",
            value: new Date(item.updatedAtISO).toLocaleDateString("ja-JP"),
          },
        ],
      };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start space-x-4">
        {/* サムネイル画像 */}
        <div className="flex-shrink-0">
          <ThumbnailImage
            src={commonData.thumbnailUrl}
            alt={commonData.title}
            className="w-32 h-24 object-cover rounded"
          />
        </div>

        {/* メインコンテンツ */}
        <div className="flex-1 min-w-0">
          {/* タイトル */}
          {type === "work" ? (
            <Link
              href={`/admin/works/${isWorkData(item) ? item.productId : item.id}`}
            >
              <h3 className="text-lg font-medium text-gray-900 mb-2 line-clamp-2 hover:text-blue-600 cursor-pointer transition-colors">
                {commonData.title}
              </h3>
            </Link>
          ) : (
            <Link
              href={`/admin/videos/${isVideoData(item) ? item.videoId : item.id}`}
            >
              <h3 className="text-lg font-medium text-gray-900 mb-2 line-clamp-2 hover:text-blue-600 cursor-pointer transition-colors">
                {commonData.title}
              </h3>
            </Link>
          )}

          {/* サブタイトル（チャンネル名 or サークル名・声優名） */}
          <p className="text-sm text-gray-600 mb-2">
            {typeSpecificData.subtitle}
          </p>

          {/* バッジ（作品のみ） */}
          {typeSpecificData.badges.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {typeSpecificData.badges.map((badge, index) => (
                <span
                  key={`${badge.text}-${badge.className}-${index}`}
                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${badge.className}`}
                >
                  {badge.text}
                </span>
              ))}
            </div>
          )}

          {/* 説明文 */}
          {commonData.description && (
            <p className="text-sm text-gray-700 mb-3 line-clamp-2">
              {commonData.description.slice(0, 150)}
              {commonData.description.length > 150 && "..."}
            </p>
          )}

          {/* メタデータ */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mb-3">
            {typeSpecificData.metadata.map((meta, index) => (
              <span key={`${meta.label}-${index}`}>
                <span className="font-medium">{meta.label}:</span> {meta.value}
              </span>
            ))}
          </div>
        </div>

        {/* アクションボタン */}
        <div className="flex-shrink-0 flex flex-col gap-2">
          {/* 詳細ボタン */}
          <Link
            href={
              type === "work"
                ? `/admin/works/${isWorkData(item) ? item.productId : item.id}`
                : `/admin/videos/${isVideoData(item) ? item.videoId : item.id}`
            }
          >
            <div className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors w-full justify-center">
              詳細
              <svg
                className="ml-1 -mr-0.5 w-4 h-4"
                fill="currentColor"
                viewBox="0 0 20 20"
                role="img"
                aria-label="Right chevron"
              >
                <path
                  fillRule="evenodd"
                  d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </Link>

          {/* 外部リンクボタン */}
          <a
            href={typeSpecificData.actionUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            {typeSpecificData.actionText}
            <svg
              className="ml-1 -mr-0.5 w-4 h-4"
              fill="currentColor"
              viewBox="0 0 20 20"
              role="img"
              aria-label="External link"
            >
              <path
                fillRule="evenodd"
                d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}
