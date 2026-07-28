import { parseDurationToSeconds, type VideoPlainObject } from "@suzumina.click/shared-types";
import type { Metadata } from "next";
import { getMyButtonDrafts } from "@/actions/button-drafts";
import { getAudioButtonsList } from "@/app/buttons/actions";
import { getVideoById, getVideosList } from "@/app/videos/actions";
import { CaptureView } from "@/components/capture/capture-view";
import ProtectedRoute from "@/components/system/protected-route";

export const metadata: Metadata = {
	title: "マーキング",
	description: "配信・動画を見ながら「ここ！」をマークして、音声ボタンの下書きを残せます",
	// ログイン前提の作業用ページのためインデックス不要
	robots: { index: false, follow: false },
};

interface CapturePageProps {
	searchParams: Promise<{ v?: string }>;
}

/**
 * マーキング対象の動画を選ぶ。
 * 手動指定（?v=）が最優先で、配信・アーカイブを問わない（動画視聴マーキングはここを通る）。
 * 無指定時のみ配信中 → 直近の配信予定の順に自動選択する（配信時の即応性のための便宜であって、
 * 対象の決定手段の正本ではない）。どちらも当たらなければ null = 選択状態。
 * liveBroadcastContent の鮮度は fetchYouTubeVideos の更新頻度に依存するため、
 * 拾えないときの逃げ道として手動指定を残している（SPR-230 の stale 対策と同じ理由）。
 */
async function findTargetVideo(manualVideoId?: string): Promise<VideoPlainObject | null> {
	if (manualVideoId) {
		return await getVideoById(manualVideoId);
	}

	// getVideosList はリポジトリ既定の「全件取得 + in-memory フィルタ」（SPR-213）。videos は数百件規模かつ
	// /watch はログイン者専用の低頻度ページのため許容。レイテンシが実測で問題になったら専用クエリ + 複合
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
 *
 * この画面に置くのは「今回のマーク」（表示中の動画の下書き）だけ（導線再設計 段2）。
 * 他の配信の下書きは棚（/drafts）の仕事なので件数の案内だけ渡す。
 * 複数グループの仕上げ可否判定（getVideosByIds）も /drafts 側に移った。
 */
async function CaptureContent({ manualVideoId }: { manualVideoId?: string }) {
	const [video, draftsResult] = await Promise.all([
		findTargetVideo(manualVideoId),
		// 既定 limit=100 だと下書き多数のユーザーで一覧が黙って欠けるため、保持上限の500で全件取る
		// （/buttons/create のキュー取得と同じ判断・SPR-266）
		getMyButtonDrafts(500),
	]);

	const allDrafts = draftsResult.success ? draftsResult.data : [];
	const currentDrafts = video ? allDrafts.filter((d) => d.videoId === video.videoId) : [];
	const otherDrafts = allDrafts.length - currentDrafts.length;
	const otherVideos = new Set(
		allDrafts.filter((d) => d.videoId !== video?.videoId).map((d) => d.videoId),
	).size;

	// マーク位置レーンの目印用に、この動画の作成済みボタンの開始秒を取る（/buttons/create の探索レーンと同じ判断）
	let madeMarks: number[] = [];
	if (video) {
		const buttonsResult = await getAudioButtonsList({
			videoId: video.videoId,
			onlyPublic: true,
			limit: 1000,
		});
		madeMarks = buttonsResult.success
			? buttonsResult.data.audioButtons.map((button) => button.startTime)
			: [];
	}

	return (
		<CaptureView
			video={video}
			// 手動指定したのに引けなかった＝未取得の動画。選択状態に戻すだけだと
			// 「入力したのに何も起きない」ように見えるため、理由を伝える
			notFoundVideoId={manualVideoId && !video ? manualVideoId : undefined}
			initialDrafts={currentDrafts}
			otherDraftsSummary={otherDrafts > 0 ? { videos: otherVideos, drafts: otherDrafts } : null}
			madeMarks={madeMarks}
			videoDurationSeconds={video ? parseDurationToSeconds(video.duration) : 0}
		/>
	);
}

export default async function CapturePage({ searchParams }: CapturePageProps) {
	const { v } = await searchParams;

	return (
		<ProtectedRoute callbackPath={v ? `/watch?v=${encodeURIComponent(v)}` : "/watch"}>
			<CaptureContent manualVideoId={v} />
		</ProtectedRoute>
	);
}
