"use client";

import type { VideoType } from "@/lib/videos/types";
import { useSearchParams } from "next/navigation";
import VideoList from "../_components/VideoList";

/**
 * 動画一覧ページ
 * すべての動画を一覧表示する
 */
export default function VideosPage() {
  // URLパラメータからフィルタタイプを取得
  const searchParams = useSearchParams();
  const typeParam = searchParams.get("type") as VideoType | null;

  // 有効なフィルタタイプの場合のみ適用
  const filterType =
    typeParam === "archived" || typeParam === "upcoming" ? typeParam : "all";

  // フィルタタイプに応じてページタイトルを変更
  const getPageTitle = () => {
    switch (filterType) {
      case "archived":
        return "配信済み動画一覧";
      case "upcoming":
        return "配信予定一覧";
      default:
        return "動画一覧";
    }
  };

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{getPageTitle()}</h1>
        <p className="text-gray-600 mt-2">
          涼花みなせさんの動画を一覧表示しています
        </p>
      </div>

      {/* 動画一覧（フィルタリングを適用） */}
      <VideoList defaultVideoType={filterType} />
    </main>
  );
}
