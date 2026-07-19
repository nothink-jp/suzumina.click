import type { AudioButtonPlainObject } from "@suzumina.click/shared-types";
import { AUDIO_BUTTON_USAGE_TAGS, isAudioButtonUsageTag } from "@suzumina.click/shared-types";
import type { ButtonGroup } from "../components/grouped-buttons-view";

/**
 * 用途別/動画ごとビューのグルーピング（SPR-257 PR②・純関数）。
 * 全ボタンは in-memory で受け取り、表示は各グループ cap 件に丸める（総数は total に保持）。
 */

/** 用途別: 公式語彙の表示順（AUDIO_BUTTON_USAGE_TAGS が正）でグループ化。未分類は末尾に置く */
export function groupByUsageTag(buttons: AudioButtonPlainObject[], cap: number): ButtonGroup[] {
	const byTag = new Map<string, AudioButtonPlainObject[]>();
	const untagged: AudioButtonPlainObject[] = [];
	for (const button of buttons) {
		const usageTag = (button.tags ?? []).find(isAudioButtonUsageTag);
		if (usageTag) {
			const list = byTag.get(usageTag) ?? [];
			list.push(button);
			byTag.set(usageTag, list);
		} else {
			untagged.push(button);
		}
	}

	const groups: ButtonGroup[] = [];
	for (const tag of AUDIO_BUTTON_USAGE_TAGS) {
		const list = byTag.get(tag);
		if (!list || list.length === 0) continue;
		groups.push({
			key: tag,
			title: tag,
			total: list.length,
			buttons: list.slice(0, cap),
			moreHref: `/buttons?tags=${encodeURIComponent(tag)}`,
		});
	}
	if (untagged.length > 0) {
		groups.push({
			key: "未分類",
			title: "未分類",
			total: untagged.length,
			buttons: untagged.slice(0, cap),
		});
	}
	return groups;
}

/** 動画ごと: videoId でグループ化し、最新ボタンの作成日時が新しい動画から並べる */
export function groupByVideo(buttons: AudioButtonPlainObject[], cap: number): ButtonGroup[] {
	const byVideo = new Map<string, AudioButtonPlainObject[]>();
	for (const button of buttons) {
		const list = byVideo.get(button.videoId) ?? [];
		list.push(button);
		byVideo.set(button.videoId, list);
	}

	return [...byVideo.entries()]
		.map(([videoId, list]) => ({ videoId, list, latest: latestCreatedAt(list) }))
		.sort((a, b) => b.latest.localeCompare(a.latest))
		.map(({ videoId, list }) => ({
			key: videoId,
			title: list[0]?.videoTitle ?? "",
			total: list.length,
			buttons: list.slice(0, cap),
			thumbnailUrl:
				list[0]?.videoThumbnailUrl || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
			videoHref: `/videos/${videoId}`,
			moreHref: `/buttons?videoId=${encodeURIComponent(videoId)}`,
		}));
}

function latestCreatedAt(buttons: AudioButtonPlainObject[]): string {
	// createdAt は ISO string（audioButtons の時刻規約）のため文字列比較で最新を選べる
	return buttons.reduce((max, b) => (b.createdAt > max ? b.createdAt : max), "");
}
