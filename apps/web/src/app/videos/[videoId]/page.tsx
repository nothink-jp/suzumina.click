import { getVideoByIdServer } from "@/lib/videos/server";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import VideoPageClient from "./VideoPageClient";

/**
 * 動的レンダリングを有効化
 * データ取得のため必要
 */
export const dynamic = "force-dynamic";

/**
 * 動画詳細ページ
 * URLパラメータから動画IDを取得し、その動画の詳細を表示する
 * 注意: Next.js 15.3.1の型エラーを回避するために型アサーションを使用しています
 */
// biome-ignore lint/suspicious/noExplicitAny: Next.js 15.3.1の型エラーを回避するために型アサーションを使用しています
export default async function VideoPage({ params }: any) {
  // 動画IDを取得
  const { videoId } = params;

  // 動画情報を取得
  const video = await getVideoByIdServer(videoId);

  // 動画が見つからない場合は404
  if (!video) {
    notFound();
  }

  return <VideoPageClient video={video} />;
}

/**
 * 動的メタデータの生成
 * 動画情報に基づいてページのメタデータを設定
 * 注意: Next.js 15.3.1の型エラーを回避するために型アサーションを使用しています
 */
// biome-ignore lint/suspicious/noExplicitAny: Next.js 15.3.1の型エラーを回避するために型アサーションを使用しています
export async function generateMetadata({ params }: any): Promise<Metadata> {
  // 動画IDを取得
  const { videoId } = params;

  // 動画情報を取得
  const video = await getVideoByIdServer(videoId);

  // 動画が見つからない場合はデフォルトのメタデータを返す
  if (!video) {
    return {
      title: "動画が見つかりません | すずみなくりっく！",
      description: "お探しの動画は見つかりませんでした。",
    };
  }

  // 動画情報に基づくメタデータを返す
  return {
    title: `${video.title} | すずみなくりっく！`,
    description: video.description || "涼花みなせ様の野良ファンサイト",
  };
}
