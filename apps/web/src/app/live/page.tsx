import type { VideoPlainObject } from "@suzumina.click/shared-types";
import type { Metadata } from "next";
import { getMyButtonDrafts } from "@/actions/button-drafts";
import { getVideoById, getVideosList } from "@/app/videos/actions";
import { LiveCaptureView } from "@/components/live/live-capture-view";
import ProtectedRoute from "@/components/system/protected-route";

export const metadata: Metadata = {
	title: "配信中マーキング",
	description: "配信視聴中に「ここ！」をマークして、音声ボタンの下書きを残せます",
	// ログイン前提の作業用ページのためインデックス不要
	robots: { index: false, follow: false },
};

interface LivePageProps {
	searchParams: Promise<{ v?: string }>;
}

/**
 * マーキング対象の動画を選ぶ。
 * 手動指定（?v=）が最優先。なければ配信中 → 直近の配信予定の順。
 * liveBroadcastContent の鮮度は fetchYouTubeVideos の更新頻度に依存するため、
 * 拾えないときの逃げ道として手動指定を残している（SPR-230 の stale 対策と同じ理由）。
 */
async function findTargetVideo(manualVideoId?: string): Promise<VideoPlainObject | null> {
	if (manualVideoId) {
		return await getVideoById(manualVideoId);
	}

	// getVideosList はリポジトリ既定の「全件取得 + in-memory フィルタ」（SPR-213）。videos は数百件規模かつ
	// /live はログイン者専用の低頻度ページのため許容。レイテンシが実測で問題になったら専用クエリ + 複合
	// インデックス（terraform 同時追加）を別 Issue で検討する
	const { items } = await getVideosList({
		page: 1,
		limit: 12,
		filters: { videoType: "live_upcoming" },
	});

	// 判定の正本は _computed.videoType（video-card-actions / video-badge と同一。
	// raw の liveBroadcastContent は stale がありうるため使わない）
	const live = items.find(
		(v) => v._computed.videoType === "live" || v._computed.videoType === "possibly_live",
	);
	if (live) {
		return live;
	}

	const upcoming = items
		.filter((v) => v._computed.videoType === "upcoming")
		.sort((a, b) =>
			(a.liveStreamingDetails?.scheduledStartTime ?? "9999").localeCompare(
				b.liveStreamingDetails?.scheduledStartTime ?? "9999",
			),
		);
	return upcoming[0] ?? null;
}

/**
 * データ取得は ProtectedRoute の内側で行う（未認証時はリダイレクトされ、ここは実行されない）。
 */
async function LiveCaptureContent({ manualVideoId }: { manualVideoId?: string }) {
	const [video, draftsResult] = await Promise.all([
		findTargetVideo(manualVideoId),
		// 既定 limit=100 だと下書き多数のユーザーで一覧が黙って欠けるため、保持上限の500で全件取る
		// （/buttons/create のキュー取得と同じ判断・SPR-266）
		getMyButtonDrafts(500),
	]);

	return (
		<LiveCaptureView video={video} initialDrafts={draftsResult.success ? draftsResult.data : []} />
	);
}

export default async function LivePage({ searchParams }: LivePageProps) {
	const { v } = await searchParams;

	return (
		<ProtectedRoute callbackPath={v ? `/live?v=${encodeURIComponent(v)}` : "/live"}>
			<LiveCaptureContent manualVideoId={v} />
		</ProtectedRoute>
	);
}
