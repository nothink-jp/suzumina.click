import type { AudioButtonDraft } from "@suzumina.click/shared-types";

/**
 * /live 下書きキューの動画単位グループ（SPR-266 第2段のキュー画面）。
 * 「仕上げ済み」の区別は不要（仕上げ＝下書き消化で一覧から消えるため、表示されるのは常に未処理）。
 */
export interface DraftVideoGroup {
	videoId: string;
	videoTitle: string;
	/** suggestedStartTime 昇順（仕上げは動画の時系列順が自然なため） */
	drafts: AudioButtonDraft[];
	/** グループの並び替えキー: グループ内で最新の createdAt（ISO string） */
	latestCreatedAt: string;
}

/**
 * 下書きを動画単位にグルーピングする。
 * グループは最新マークを含む順（= 直近の配信が先頭）、グループ内は推奨開始秒の昇順。
 */
export function groupDraftsByVideo(drafts: AudioButtonDraft[]): DraftVideoGroup[] {
	const map = new Map<string, DraftVideoGroup>();
	for (const draft of drafts) {
		const group = map.get(draft.videoId);
		if (group) {
			group.drafts.push(draft);
			if (draft.createdAt > group.latestCreatedAt) {
				group.latestCreatedAt = draft.createdAt;
			}
		} else {
			map.set(draft.videoId, {
				videoId: draft.videoId,
				videoTitle: draft.videoTitle,
				drafts: [draft],
				latestCreatedAt: draft.createdAt,
			});
		}
	}
	const groups = [...map.values()];
	for (const group of groups) {
		group.drafts.sort((a, b) => a.suggestedStartTime - b.suggestedStartTime);
	}
	// ISO 8601 (UTC) は辞書順 = 時刻順
	groups.sort((a, b) => b.latestCreatedAt.localeCompare(a.latestCreatedAt));
	return groups;
}
