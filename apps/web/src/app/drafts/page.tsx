import type { Metadata } from "next";
import { getMyButtonDrafts } from "@/actions/button-drafts";
import { getVideosByIds } from "@/app/videos/actions";
import { isAwaitingArchive } from "@/components/capture/video-mode";
import { type DraftShelfVideoInfo, DraftsShelfView } from "@/components/drafts/drafts-shelf-view";
import ProtectedRoute from "@/components/system/protected-route";

export const metadata: Metadata = {
	title: "マーク（下書き）",
	description: "配信や動画を見ながら拾ったマークを、配信ごとにまとめて音声ボタンに仕上げられます",
	// ログイン前提の作業用ページのためインデックス不要
	robots: { index: false, follow: false },
};

/**
 * マーク棚（導線再設計 段2）。ナビ「マーク N」の行き先。
 * 溜める・棚卸しは視聴と別セッションの仕事のため /watch から分離した。
 *
 * 仕上げ可否（配信中・配信予定はまだ仕上げられない）はグループ自身の動画の**現在**状態で
 * 判定する。videos の一括取得はグループ数ぶんの getAll 1回（低頻度ページのため許容）。
 */
async function DraftsContent() {
	const draftsResult = await getMyButtonDrafts(500);
	const drafts = draftsResult.success ? draftsResult.data : [];

	const videoIds = [...new Set(drafts.map((draft) => draft.videoId))];
	const videos = await getVideosByIds(videoIds);
	const videoInfos: Record<string, DraftShelfVideoInfo> = {};
	for (const video of videos) {
		videoInfos[video.videoId] = {
			isAwaitingArchive: isAwaitingArchive(video),
			audioButtonCount: video.audioButtonCount ?? 0,
		};
	}

	return <DraftsShelfView initialDrafts={drafts} videoInfos={videoInfos} />;
}

export default function DraftsPage() {
	return (
		<ProtectedRoute callbackPath="/drafts">
			<DraftsContent />
		</ProtectedRoute>
	);
}
