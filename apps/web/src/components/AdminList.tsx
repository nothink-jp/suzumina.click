import type { FrontendVideoData } from "@suzumina.click/shared-types/src/video";
import type { FrontendDLsiteWorkData } from "@suzumina.click/shared-types/src/work";
import AdminListItem from "./AdminListItem";
import Pagination from "./Pagination";

interface AdminListProps<T extends FrontendVideoData | FrontendDLsiteWorkData> {
  items: T[];
  totalCount: number;
  currentPage: number;
  title: string;
  type: "video" | "work";
  emptyMessage?: string;
}

// 統一された管理画面用リストコンポーネント
export default function AdminList<
  T extends FrontendVideoData | FrontendDLsiteWorkData,
>({
  items,
  totalCount,
  currentPage,
  title,
  type,
  emptyMessage = "データが見つかりませんでした",
}: AdminListProps<T>) {
  const itemsPerPage = 10;
  const totalPages = Math.ceil(totalCount / itemsPerPage);

  return (
    <div>
      {/* ヘッダー */}
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">
          {title} (全{totalCount.toLocaleString()}件)
        </h2>
        <div className="text-sm text-gray-600">
          {currentPage}ページ / {totalPages}ページ
        </div>
      </div>

      {/* リスト */}
      {items.length === 0 ? (
        <div className="text-center py-12">
          <div className="mx-auto w-24 h-24 mb-4 text-gray-300">
            {type === "video" ? (
              <svg
                fill="currentColor"
                viewBox="0 0 24 24"
                role="img"
                aria-label="Video player icon"
              >
                <path d="M21,3H3C1.89,3 1,3.89 1,5V19A2,2 0 0,0 3,21H21A2,2 0 0,0 23,19V5C23,3.89 22.1,3 21,3M21,19H3V5H21V19Z" />
                <path d="M10,15L15.19,12L10,9V15Z" />
              </svg>
            ) : (
              <svg
                fill="currentColor"
                viewBox="0 0 24 24"
                role="img"
                aria-label="Work document icon"
              >
                <path d="M19,3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.1,3 19,3M19,19H5V5H19V19Z" />
                <path d="M13.96,12.71L11.05,15.62L8.23,12.8L5.65,15.38L5.38,15.38V5.38H18.62V15.38L13.96,12.71Z" />
              </svg>
            )}
          </div>
          <p className="text-gray-500 text-lg">{emptyMessage}</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {items.map((item) => (
            <AdminListItem key={item.id} item={item} type={type} />
          ))}
        </div>
      )}

      {/* ページネーション */}
      {totalPages > 1 && (
        <div className="mt-8">
          <Pagination currentPage={currentPage} totalPages={totalPages} />
        </div>
      )}

      {/* 統計情報 */}
      {items.length > 0 && (
        <div className="mt-6 text-sm text-gray-500 text-center">
          {totalCount.toLocaleString()}件中{" "}
          {((currentPage - 1) * itemsPerPage + 1).toLocaleString()}〜
          {Math.min(currentPage * itemsPerPage, totalCount).toLocaleString()}
          件を表示
        </div>
      )}
    </div>
  );
}
