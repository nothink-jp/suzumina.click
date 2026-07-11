import { getAudioButtonById, getAudioButtonsList } from "@/app/buttons/actions";
import { AudioButtonWithPlayCount } from "@/components/audio/audio-button-with-play-count";
import { AudioButtonQuickView } from "@/components/audio-button-detail/audio-button-quick-view";
import { SourceVideoMini } from "@/components/audio-button-detail/source-video-mini";
import { AudioButtonDetailModal } from "./audio-button-detail-modal";

/**
 * 一覧からのクライアント遷移時のみ発動する intercepting route（SPR-251/252/256）。
 * URL は /buttons/{id} に同期しつつ、一覧の文脈を保ったままクイックビューを重ねる。
 * 直接アクセス・リロード時はインターセプトされず、フル詳細ページ（../[id]/page.tsx）が表示される。
 * クイックビューに徹し（description・編集/削除なし・確定済み）、ハブ機能は「ページで開く」に委ねる。
 */

/** デザイン準拠の表示上限（この動画の他のボタン） */
const RELATED_LIMIT = 3;

export default async function InterceptedAudioButtonPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	// クイックビューはどの経路でも 500 にしない（取得不可ならモーダルを重ねず一覧に留まる）
	const result = await getAudioButtonById(id).catch(() => null);
	if (!result?.success) {
		return null;
	}
	const audioButton = result.data;

	// この動画の他のボタン（取得失敗は空でモーダル表示を継続）
	const relatedResult = await getAudioButtonsList({
		videoId: audioButton.videoId,
		limit: RELATED_LIMIT + 1,
		sortBy: "newest",
		onlyPublic: true,
	}).catch(() => null);
	const related = (relatedResult?.success ? relatedResult.data.audioButtons : [])
		.filter((b) => b.id !== audioButton.id)
		.slice(0, RELATED_LIMIT);

	return (
		<AudioButtonDetailModal audioButtonId={audioButton.id}>
			<AudioButtonQuickView audioButton={audioButton} />

			<div className="mx-7 border-t border-border" />

			<SourceVideoMini
				videoId={audioButton.videoId}
				videoTitle={audioButton.videoTitle}
				videoThumbnailUrl={audioButton.videoThumbnailUrl}
				startTime={audioButton.startTime}
				endTime={audioButton.endTime || audioButton.startTime}
			/>

			{related.length > 0 && (
				<div className="px-7 pt-1.5 pb-[26px]">
					<p className="mb-2.5 text-left text-xs font-bold text-muted-foreground">
						この動画の他のボタン
					</p>
					<div className="flex flex-wrap justify-start gap-2.5">
						{related.map((button) => (
							<AudioButtonWithPlayCount
								key={button.id}
								audioButton={button}
								showFavorite={true}
								maxTitleLength={30}
							/>
						))}
					</div>
				</div>
			)}
		</AudioButtonDetailModal>
	);
}
