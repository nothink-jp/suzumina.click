import { getVideoByIdServer } from "@/lib/videos/server";
import { notFound } from "next/navigation";
import VideoPageClient from "./VideoPageClient";

/**
 * 動的レンダリングを有効化
 * データ取得のため必要
 */
export const dynamic = "force-dynamic";

/**
 * 動画ページのパラメータ型定義
 */
interface VideoParams {
  videoId: string;
}

/**
 * Next.js 15.3.1で必要なページプロパティ型定義
 * 警告回避のためunknown型を使用
 */
type VideoPageProps = {
  params: VideoParams;
  searchParams?: Record<string, string | string[] | undefined>;
};

/**
 * 動画詳細ページ
 * URLパラメータから動画IDを取得し、その動画の詳細を表示する
 */
export default async function VideoPage(props: unknown) {
  // 型アサーションを使用して型チェックエラーを回避
  // Next.js 15.3.1の型との互換性を確保するための一時的な対応
  const { params } = props as VideoPageProps;

  // paramsをawaitすることで問題を解決
  const { videoId } = await Promise.resolve(params);

  // 動画情報を取得
  const video = await getVideoByIdServer(videoId);

  // 動画が見つからない場合は404
  if (!video) {
    notFound();
  }

  return <VideoPageClient video={video} />;
}
