import {
  getAudioClips,
  incrementPlayCount,
} from "@/actions/audioclips/actions";
import { checkTimeRangeOverlapAction } from "@/actions/audioclips/check-overlap";
import { getVideoTimeRangesAction } from "@/actions/audioclips/get-timeranges";
import {
  checkMultipleFavoriteStatus,
  toggleFavorite,
} from "@/actions/audioclips/manage-favorites";
import VideoPageClient from "@/components/videos/VideoPageClient";
import { getVideoByIdServer } from "@/lib/videos/server";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

/**
 * 動的レンダリングを有効化
 * データ取得のため必要
 */
export const dynamic = "force-dynamic";

/**
 * 動画詳細ページ
 * URLパラメータから動画IDを取得し、その動画の詳細を表示する
 * サーバーコンポーネント設計ガイドラインに従い、必要なデータを事前にフェッチして
 * クライアントコンポーネントに渡す
 */
// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export default async function VideoPage({ params }: any) {
  // 動画IDを取得
  const { videoId } = params;

  // 動画情報を取得
  const video = await getVideoByIdServer(videoId);

  // 動画が見つからない場合は404
  if (!video) {
    notFound();
  }

  // 音声クリップの初期データを取得
  const initialClipsData = await getAudioClips({
    videoId,
    limit: 10,
  });

  // getAudioClipsのアダプター関数を作成
  const getAudioClipsAdapter = async (
    params: Parameters<typeof getAudioClips>[0],
  ) => {
    "use server"; // Server Actionであることを明示

    return getAudioClips(params);
  };

  // アダプター関数の作成
  // checkMultipleFavoriteStatusをVideoPageClientのcheckFavoriteStatusActionの型に合わせる
  const singleCheckFavoriteStatus = async (clipId: string, userId?: string) => {
    "use server"; // Server Actionであることを明示

    // ユーザーIDがない場合はfalseを返す
    if (!userId) return false;

    // 1つのIDだけを配列に入れて元の関数を呼び出す
    const result = await checkMultipleFavoriteStatus([clipId]);
    // 結果から該当するクリップのお気に入り状態を返す
    return result[clipId] || false;
  };

  // incrementPlayCountの戻り値をvoidに変換するアダプター
  const incrementPlayCountAdapter = async (clipId: string): Promise<void> => {
    "use server"; // Server Actionであることを明示

    await incrementPlayCount(clipId);
    return;
  };

  // toggleFavoriteアダプター - 戻り値をvoidに変更
  const toggleFavoriteAdapter = async (clipId: string): Promise<void> => {
    "use server"; // Server Actionであることを明示

    // toggleFavoriteはcurrentUserを内部で取得するため、userIdは不要
    await toggleFavorite(clipId);
    return;
  };

  return (
    <VideoPageClient
      video={video}
      initialClipsData={initialClipsData}
      // Server Actionsをpropsとして渡す
      getAudioClipsAction={getAudioClipsAdapter}
      checkFavoriteStatusAction={singleCheckFavoriteStatus}
      incrementPlayCountAction={incrementPlayCountAdapter}
      toggleFavoriteAction={toggleFavoriteAdapter}
      checkOverlapAction={checkTimeRangeOverlapAction}
      getTimeRangesAction={getVideoTimeRangesAction}
    />
  );
}

/**
 * 動的メタデータの生成
 * 動画情報に基づいてページのメタデータを設定
 */
// biome-ignore lint/suspicious/noExplicitAny: <explanation>
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
