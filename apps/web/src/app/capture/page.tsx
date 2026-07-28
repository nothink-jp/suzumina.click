import type { AudioButtonDraft, VideoPlainObject } from "@suzumina.click/shared-types";
import type { Metadata } from "next";
import { getMyButtonDrafts } from "@/actions/button-drafts";
import { getVideoById, getVideosByIds, getVideosList } from "@/app/videos/actions";
import { CaptureView } from "@/components/capture/capture-view";
import { isAwaitingArchive } from "@/components/capture/video-mode";
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
	// /capture はログイン者専用の低頻度ページのため許容。レイテンシが実測で問題になったら専用クエリ + 複合
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
 * 下書きを持つ動画のうち、まだ仕上げられない（配信中・配信予定）ものを列挙する。
 *
 * 判定はグループ自身の動画の**現在**状態で行う。表示中の動画と一致するかで判定していた頃は、
 * 表示していない配信中の動画のグループが仕上げ可能に見え、遷移先の canCreateAudioButton で
 * 弾かれていた（対象が配信1本に限られていた頃は表面化しなかった）。
 */
async function findAwaitingArchiveVideoIds(
	drafts: AudioButtonDraft[],
	currentVideo: VideoPlainObject | null,
): Promise<string[]> {
	// 表示中の動画は取得済みなので再取得しない
	const idsToFetch = [...new Set(drafts.map((draft) => draft.videoId))].filter(
		(videoId) => videoId !== currentVideo?.videoId,
	);
	const videos = await getVideosByIds(idsToFetch);
	if (currentVideo) {
		videos.push(currentVideo);
	}
	return videos.filter(isAwaitingArchive).map((video) => video.videoId);
}

/**
 * データ取得は ProtectedRoute の内側で行う（未認証時はリダイレクトされ、ここは実行されない）。
 */
async function CaptureContent({ manualVideoId }: { manualVideoId?: string }) {
	const [video, draftsResult] = await Promise.all([
		findTargetVideo(manualVideoId),
		// 既定 limit=100 だと下書き多数のユーザーで一覧が黙って欠けるため、保持上限の500で全件取る
		// （/buttons/create のキュー取得と同じ判断・SPR-266）
		getMyButtonDrafts(500),
	]);

	const drafts = draftsResult.success ? draftsResult.data : [];
	const awaitingArchiveVideoIds = await findAwaitingArchiveVideoIds(drafts, video);

	return (
		<CaptureView
			video={video}
			// 手動指定したのに引けなかった＝未取得の動画。選択状態に戻すだけだと
			// 「入力したのに何も起きない」ように見えるため、理由を伝える
			notFoundVideoId={manualVideoId && !video ? manualVideoId : undefined}
			initialDrafts={drafts}
			awaitingArchiveVideoIds={awaitingArchiveVideoIds}
		/>
	);
}

export default async function CapturePage({ searchParams }: CapturePageProps) {
	const { v } = await searchParams;

	return (
		<ProtectedRoute callbackPath={v ? `/capture?v=${encodeURIComponent(v)}` : "/capture"}>
			<CaptureContent manualVideoId={v} />
		</ProtectedRoute>
	);
}
