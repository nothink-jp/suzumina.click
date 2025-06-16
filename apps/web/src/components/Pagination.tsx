"use client";

import {
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  Pagination as UIPagination,
} from "@suzumina.click/ui/components/pagination";
import { useRouter } from "next/navigation";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
}

// Client Component版のPagination（URLベースのナビゲーション）
export default function Pagination({
  currentPage,
  totalPages,
}: PaginationProps) {
  const router = useRouter();

  const handlePageChange = (page: number) => {
    if (page === currentPage) return;

    // URLを更新してServer Componentでのデータ再取得をトリガー
    const url = new URL(window.location.href);
    url.searchParams.set("page", page.toString());
    router.push(url.pathname + url.search);
  };

  return (
    <UIPagination>
      <PaginationContent>
        {/* 前のページ */}
        <PaginationItem>
          <PaginationPrevious
            href="#"
            onClick={(e) => {
              e.preventDefault();
              if (currentPage > 1) {
                handlePageChange(currentPage - 1);
              }
            }}
            className={currentPage <= 1 ? "opacity-50 cursor-not-allowed" : ""}
          />
        </PaginationItem>

        {/* ページ番号表示ロジック */}
        {(() => {
          const maxVisiblePages = 5;
          const startPage = Math.max(
            1,
            currentPage - Math.floor(maxVisiblePages / 2),
          );
          const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
          const adjustedStartPage = Math.max(1, endPage - maxVisiblePages + 1);

          const visiblePages = [];
          for (let i = adjustedStartPage; i <= endPage; i++) {
            visiblePages.push(i);
          }

          return (
            <>
              {/* 最初のページ（省略記号付き） */}
              {visiblePages.length > 0 &&
                visiblePages[0] !== undefined &&
                visiblePages[0] > 1 && (
                  <>
                    <PaginationItem>
                      <PaginationLink
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          handlePageChange(1);
                        }}
                      >
                        1
                      </PaginationLink>
                    </PaginationItem>
                    {visiblePages[0] > 2 && (
                      <PaginationItem>
                        <PaginationEllipsis />
                      </PaginationItem>
                    )}
                  </>
                )}

              {/* 表示されるページ番号 */}
              {visiblePages.map((page) => (
                <PaginationItem key={page}>
                  <PaginationLink
                    href="#"
                    isActive={page === currentPage}
                    onClick={(e) => {
                      e.preventDefault();
                      handlePageChange(page);
                    }}
                  >
                    {page}
                  </PaginationLink>
                </PaginationItem>
              ))}

              {/* 最後のページ（省略記号付き） */}
              {(() => {
                const lastPage = visiblePages[visiblePages.length - 1];
                return (
                  visiblePages.length > 0 &&
                  lastPage !== undefined &&
                  lastPage < totalPages && (
                    <>
                      {lastPage < totalPages - 1 && (
                        <PaginationItem>
                          <PaginationEllipsis />
                        </PaginationItem>
                      )}
                      <PaginationItem>
                        <PaginationLink
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            handlePageChange(totalPages);
                          }}
                        >
                          {totalPages}
                        </PaginationLink>
                      </PaginationItem>
                    </>
                  )
                );
              })()}
            </>
          );
        })()}

        {/* 次のページ */}
        <PaginationItem>
          <PaginationNext
            href="#"
            onClick={(e) => {
              e.preventDefault();
              if (currentPage < totalPages) {
                handlePageChange(currentPage + 1);
              }
            }}
            className={
              currentPage >= totalPages ? "opacity-50 cursor-not-allowed" : ""
            }
          />
        </PaginationItem>
      </PaginationContent>
    </UIPagination>
  );
}
