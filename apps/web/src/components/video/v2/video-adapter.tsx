import type { FrontendVideoData } from "@suzumina.click/shared-types";
import { Video as VideoV2 } from "@suzumina.click/shared-types";
import { memo, useMemo } from "react";
import VideoCardV2 from "./video-card-v2";
import VideoListV2 from "./video-list-v2";

/**
 * 既存のFrontendVideoDataをVideoV2に変換するアダプター
 */
export function convertToVideoV2(videoData: FrontendVideoData): VideoV2 {
	return VideoV2.fromLegacyFormat(videoData);
}

/**
 * 複数のFrontendVideoDataをVideoV2配列に変換
 */
export function convertToVideoV2Array(videosData: FrontendVideoData[]): VideoV2[] {
	return videosData.map(convertToVideoV2);
}

interface VideoCardAdapterProps {
	video: FrontendVideoData;
	buttonCount?: number;
	variant?: "grid" | "sidebar";
	priority?: boolean;
}

/**
 * 既存のVideoCardインターフェースに対応するアダプターコンポーネント
 * FrontendVideoDataを受け取り、VideoV2に変換してVideoCardV2に渡す
 */
export const VideoCardAdapter = memo(function VideoCardAdapter({
	video,
	buttonCount,
	variant,
	priority,
}: VideoCardAdapterProps) {
	const videoV2 = useMemo(() => convertToVideoV2(video), [video]);
	const audioButtonCount = buttonCount ?? video.audioButtonCount ?? 0;

	return (
		<VideoCardV2
			video={videoV2}
			audioButtonCount={audioButtonCount}
			variant={variant}
			priority={priority}
		/>
	);
});

interface VideoListAdapterProps {
	videos: FrontendVideoData[];
	loading?: boolean;
	error?: string | null;
	variant?: "grid" | "list";
}

/**
 * 既存のVideoListインターフェースに対応するアダプターコンポーネント
 * FrontendVideoData配列を受け取り、VideoV2配列に変換してVideoListV2に渡す
 */
export const VideoListAdapter = memo(function VideoListAdapter({
	videos,
	loading,
	error,
	variant,
}: VideoListAdapterProps) {
	const videosV2 = useMemo(() => convertToVideoV2Array(videos), [videos]);

	// 音声ボタン数のマップを作成
	const audioButtonCounts = useMemo(() => {
		const counts: Record<string, number> = {};
		videos.forEach((video) => {
			if (video.audioButtonCount) {
				counts[video.id] = video.audioButtonCount;
			}
		});
		return counts;
	}, [videos]);

	return (
		<VideoListV2
			videos={videosV2}
			audioButtonCounts={audioButtonCounts}
			loading={loading}
			error={error}
			variant={variant}
		/>
	);
});
