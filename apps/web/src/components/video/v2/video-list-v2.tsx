"use client";

import type { Video as VideoV2 } from "@suzumina.click/shared-types";
import { LoadingSkeleton } from "@suzumina.click/ui/components/custom/loading-skeleton";
import { memo } from "react";
import VideoCardV2 from "./video-card-v2";

interface VideoListV2Props {
	videos: VideoV2[];
	audioButtonCounts?: Record<string, number>;
	loading?: boolean;
	error?: string | null;
	variant?: "grid" | "list";
}

/**
 * Video V2 Entity用のリストコンポーネント
 * グリッド表示とリスト表示に対応
 */
export const VideoListV2 = memo(function VideoListV2({
	videos,
	audioButtonCounts = {},
	loading = false,
	error = null,
	variant = "grid",
}: VideoListV2Props) {
	// ローディング状態
	if (loading) {
		return (
			<div className="w-full">
				<LoadingSkeleton
					variant={variant === "grid" ? "grid" : "list"}
					height={variant === "grid" ? 400 : 120}
					count={variant === "grid" ? 6 : 5}
				/>
			</div>
		);
	}

	// エラー状態
	if (error) {
		return (
			<div className="text-center py-12 text-muted-foreground">
				<div className="text-lg">動画の読み込みに失敗しました</div>
				<p className="text-sm mt-2">{error}</p>
			</div>
		);
	}

	// 動画がない場合
	if (videos.length === 0) {
		return (
			<div className="text-center py-12 text-muted-foreground">
				<p>動画が見つかりませんでした</p>
			</div>
		);
	}

	// グリッド表示
	if (variant === "grid") {
		return (
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
				{videos.map((video, index) => (
					<VideoCardV2
						key={video.id}
						video={video}
						audioButtonCount={audioButtonCounts[video.id] || 0}
						priority={index < 4} // 最初の4つの画像を優先的に読み込み
					/>
				))}
			</div>
		);
	}

	// リスト表示
	return (
		<div className="space-y-4">
			{videos.map((video, index) => (
				<VideoCardV2
					key={video.id}
					video={video}
					audioButtonCount={audioButtonCounts[video.id] || 0}
					variant="sidebar"
					priority={index < 2} // 最初の2つの画像を優先的に読み込み
				/>
			))}
		</div>
	);
});

export default VideoListV2;
