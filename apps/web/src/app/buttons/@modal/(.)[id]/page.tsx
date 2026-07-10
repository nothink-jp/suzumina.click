import { getAudioButtonById } from "@/app/buttons/actions";
import { AudioButtonDetailMainContent } from "@/components/audio-button-detail";
import { AudioButtonDetailModal } from "./audio-button-detail-modal";

/**
 * 一覧からのクライアント遷移時のみ発動する intercepting route（SPR-251/252）。
 * URL は /buttons/{id} に同期しつつ、一覧の文脈を保ったままモーダルで詳細を出す。
 * 直接アクセス・リロード時はインターセプトされず、フル詳細ページ（../[id]/page.tsx）が表示される。
 * 関連ボタン群はモーダルには載せない（クイックビューに徹し、ハブ機能はフル詳細ページ=「ページで開く」に委ねる）。
 */
export default async function InterceptedAudioButtonPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	const result = await getAudioButtonById(id).catch(() => null);
	// 取得できない場合はモーダルを重ねず一覧に留まる
	if (!result?.success) {
		return null;
	}
	return (
		<AudioButtonDetailModal audioButtonId={result.data.id}>
			<AudioButtonDetailMainContent audioButton={result.data} />
		</AudioButtonDetailModal>
	);
}
