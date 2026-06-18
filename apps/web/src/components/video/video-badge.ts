import type { VideoPlainObject } from "@suzumina.click/shared-types";
import { Clock, type LucideIcon, Radio, Video } from "lucide-react";

export interface VideoBadgeInfo {
	text: string;
	icon: LucideIcon;
	className: string;
	ariaLabel: string;
}

/**
 * 動画タイプ別バッジ情報（純関数）。
 *
 * 正本は `VideoPlainObject._computed.videoType`（shared-types の determineVideoType 由来）。
 * 一覧（video-card）と詳細（video-detail）で判定が二重化し表示が乖離していたため、
 * 双方をこの関数に統一する（SPR-186）。className の濃度差・border 有無・icon 表示は
 * 呼び出し側のクラス合成で吸収する。
 */
export function getVideoBadgeInfo(video: VideoPlainObject): VideoBadgeInfo {
	const { videoType } = video._computed;
	switch (videoType) {
		case "live":
			return {
				text: "配信中",
				icon: Radio,
				className: "bg-destructive/90 text-destructive-foreground",
				ariaLabel: "現在配信中のライブ配信",
			};
		case "upcoming":
			return {
				text: "配信予告",
				icon: Clock,
				className: "bg-info/90 text-info-foreground",
				ariaLabel: "配信予定のライブ配信",
			};
		case "possibly_live":
			return {
				text: "配信中（推定）",
				icon: Radio,
				className: "bg-destructive/90 text-destructive-foreground",
				ariaLabel: "配信中の可能性があるライブ配信",
			};
		case "archived":
			return {
				text: "配信アーカイブ",
				icon: Radio,
				className: "bg-foreground/70 text-background",
				ariaLabel: "ライブ配信のアーカイブ",
			};
		case "premiere":
			return {
				text: "プレミア公開",
				icon: Video,
				className: "bg-foreground/70 text-background",
				ariaLabel: "プレミア公開動画",
			};
		default:
			return {
				text: "通常動画",
				icon: Video,
				className: "bg-black/70 text-white",
				ariaLabel: "通常動画コンテンツ",
			};
	}
}
