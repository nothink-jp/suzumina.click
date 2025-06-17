import ThumbnailImage from "@/components/ThumbnailImage";
import type { FrontendVideoData } from "@suzumina.click/shared-types/src/video";

interface VideoDetailProps {
  video: FrontendVideoData;
}

export default function VideoDetail({ video }: VideoDetailProps) {
  // 動画タイプの表示名変換
  const getVideoTypeDisplayName = (videoType?: string) => {
    const typeMap: { [key: string]: string } = {
      all: "全動画",
      archived: "アーカイブ",
      upcoming: "予定",
    };
    return typeMap[videoType || ""] || videoType || "不明";
  };

  // ライブ配信コンテンツの表示名変換
  const getLiveBroadcastDisplayName = (liveBroadcastContent?: string) => {
    const typeMap: { [key: string]: string } = {
      none: "通常動画",
      live: "ライブ配信中",
      upcoming: "配信予定",
    };
    return (
      typeMap[liveBroadcastContent || ""] || liveBroadcastContent || "不明"
    );
  };

  // YouTubeのサムネイル品質
  const getThumbnailQualities = () => {
    if (!video.thumbnails) return [];

    return [
      { name: "デフォルト", data: video.thumbnails.default },
      { name: "中品質", data: video.thumbnails.medium },
      { name: "高品質", data: video.thumbnails.high },
    ].filter((item) => item.data);
  };

  const thumbnailQualities = getThumbnailQualities();

  return (
    <div className="max-w-6xl mx-auto">
      {/* メイン情報カード */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden mb-8">
        <div className="p-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* サムネイル画像 */}
            <div className="lg:col-span-1">
              <div className="sticky top-8">
                <ThumbnailImage
                  src={video.thumbnailUrl}
                  alt={video.title}
                  className="w-full aspect-video object-cover rounded-lg shadow-md"
                />

                {/* アクションボタン */}
                <div className="mt-6 space-y-3">
                  <a
                    href={`https://www.youtube.com/watch?v=${video.videoId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex justify-center items-center px-6 py-3 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
                  >
                    YouTubeで見る
                    <svg
                      className="ml-2 -mr-1 w-5 h-5"
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

                  <a
                    href={`https://www.youtube.com/channel/${video.channelId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex justify-center items-center px-6 py-3 border border-gray-300 rounded-lg shadow-sm text-base font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                  >
                    チャンネルを見る
                    <svg
                      className="ml-2 -mr-1 w-5 h-5"
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

            {/* 動画情報 */}
            <div className="lg:col-span-2">
              {/* タイトルとバッジ */}
              <div className="mb-6">
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                    {getVideoTypeDisplayName(video.videoType)}
                  </span>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                    {getLiveBroadcastDisplayName(video.liveBroadcastContent)}
                  </span>
                </div>

                <h1 className="text-3xl font-bold text-gray-900 leading-tight mb-2">
                  {video.title}
                </h1>

                <p className="text-lg text-gray-600">{video.videoId}</p>
              </div>

              {/* 基本情報 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
                    チャンネル情報
                  </h3>
                  <p className="text-lg text-gray-900 mb-3">
                    {video.channelTitle}
                  </p>

                  <div className="text-sm text-gray-500">
                    <p>
                      チャンネルID:{" "}
                      <span className="font-mono">{video.channelId}</span>
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
                    公開日時
                  </h3>
                  <p className="text-lg text-gray-900 mb-2">
                    {new Date(video.publishedAtISO).toLocaleString("ja-JP")}
                  </p>

                  <div className="text-sm text-gray-500">
                    <p>
                      公開日:{" "}
                      {new Date(video.publishedAtISO).toLocaleDateString(
                        "ja-JP",
                      )}
                    </p>
                    <p>
                      公開時刻:{" "}
                      {new Date(video.publishedAtISO).toLocaleTimeString(
                        "ja-JP",
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* 説明文 */}
              {video.description && (
                <div className="mb-8">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    動画説明
                  </h3>
                  <div className="prose max-w-none">
                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {video.description}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 詳細情報セクション */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 技術情報 */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">技術情報</h2>

          <dl className="space-y-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">動画ID</dt>
              <dd className="mt-1 text-sm text-gray-900 font-mono">
                {video.videoId}
              </dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-gray-500">
                Firestore ID
              </dt>
              <dd className="mt-1 text-sm text-gray-900 font-mono">
                {video.id}
              </dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-gray-500">
                チャンネルID
              </dt>
              <dd className="mt-1 text-sm text-gray-900 font-mono">
                {video.channelId}
              </dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-gray-500">YouTube URL</dt>
              <dd className="mt-1">
                <a
                  href={`https://www.youtube.com/watch?v=${video.videoId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-800 break-all"
                >
                  https://www.youtube.com/watch?v={video.videoId}
                </a>
              </dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-gray-500">
                サムネイルURL
              </dt>
              <dd className="mt-1">
                <a
                  href={video.thumbnailUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-800 break-all"
                >
                  {video.thumbnailUrl}
                </a>
              </dd>
            </div>
          </dl>
        </div>

        {/* メタデータ */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            メタデータ
          </h2>

          <dl className="space-y-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">動画タイプ</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {getVideoTypeDisplayName(video.videoType)}
              </dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-gray-500">ライブ配信</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {getLiveBroadcastDisplayName(video.liveBroadcastContent)}
              </dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-gray-500">公開日時</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {new Date(video.publishedAtISO).toLocaleString("ja-JP")}
              </dd>
            </div>

            <div>
              <dt className="text-sm font-medium text-gray-500">
                最終取得日時
              </dt>
              <dd className="mt-1 text-sm text-gray-900">
                {new Date(video.lastFetchedAtISO).toLocaleString("ja-JP")}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* サムネイル品質情報 */}
      {thumbnailQualities.length > 0 && (
        <div className="mt-8 bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            サムネイル品質
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {thumbnailQualities.map((quality, index) => (
              <div
                key={`${quality.name}-${quality.data?.width || 0}x${quality.data?.height || 0}`}
                className="text-center"
              >
                <h3 className="text-sm font-medium text-gray-700 mb-3">
                  {quality.name}
                </h3>
                <div className="mb-3">
                  <ThumbnailImage
                    src={quality.data?.url || ""}
                    alt={`${video.title} - ${quality.name}`}
                    className="w-full h-auto rounded border"
                  />
                </div>
                <div className="text-xs text-gray-500">
                  <p>
                    {quality.data?.width || 0} × {quality.data?.height || 0}
                  </p>
                  <a
                    href={quality.data?.url || ""}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 break-all"
                  >
                    URL
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
