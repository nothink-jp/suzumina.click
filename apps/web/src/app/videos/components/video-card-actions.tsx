import type { VideoPlainObject } from "@suzumina.click/shared-types";
import {
	canCreateAudioButton,
	getAudioButtonCreationErrorMessage,
} from "@suzumina.click/shared-types";
import { Button } from "@suzumina.click/ui/components/ui/button";
import { Bookmark, Clock, ExternalLink, Eye } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { resolveCaptureVideoMode } from "@/components/capture/video-mode";

interface VideoCardActionsProps {
	video: VideoPlainObject;
	variant: "grid" | "sidebar";
}

type MarkGate = { mode: "archived" | "live" | "upcoming" } | { mode: "disabled"; reason: string };

/**
 * カードの主アクションの状態を決める。行き先は全状態で /watch（マーキング）に固定し、
 * 変わるのはラベルと色だけ（導線再設計＝統一案）。「行為の選択」を動画の状態にさせない。
 * 無効化を残すのは事実の通知だけ: 埋め込み不可（プレイヤーが動かない）と、
 * 配信アーカイブでない動画（マークしてもボタンに仕上げられない）。
 *
 * モード判定の正本は resolveCaptureVideoMode（video-detail / /watch / /drafts と同一関数）。
 * その内部で使う _computed.videoType が唯一 stale に強い（raw の liveBroadcastContent や
 * raw を OR する _computed.isLive は、アーカイブ済みでも live のまま残ることがある）。
 */
function evaluateMarkGate(video: VideoPlainObject): MarkGate {
	// 埋め込み不可はモードより先（プレイヤーが動かない事実は行為の選択に優先する）
	if (video.status?.embeddable === false) {
		return {
			mode: "disabled",
			reason: "この動画は埋め込みが制限されているため、マーキングできません",
		};
	}
	const mode = resolveCaptureVideoMode(video);
	if (mode !== "archived") {
		return { mode };
	}
	if (!canCreateAudioButton(video)) {
		return {
			mode: "disabled",
			reason:
				getAudioButtonCreationErrorMessage(video) ||
				"音声ボタンを作成できるのは配信アーカイブのみです",
		};
	}
	return { mode: "archived" };
}

/** モード別の見た目（色はバッジと同色ペア: 配信中=destructive 赤 / 配信予告=info 青） */
const MARK_VARIANTS = {
	archived: {
		label: "マークして見る",
		ariaSuffix: "のマーキングを開く",
		className: "flex-1 min-h-[44px] text-sm",
		variant: "default" as const,
		icon: Bookmark,
	},
	live: {
		label: "配信中マーク",
		ariaSuffix: "の配信中マーキングを開く",
		className: "flex-1 min-h-[44px] text-sm",
		variant: "destructive" as const,
		icon: Bookmark,
	},
	upcoming: {
		label: "配信待機",
		ariaSuffix: "の配信待機（マーキング）を開く",
		className: "flex-1 min-h-[44px] text-sm bg-info text-info-foreground hover:bg-info/90",
		variant: "default" as const,
		icon: Clock,
	},
};

/**
 * VideoCard のアクション領域。
 * 主アクションは「マークして見る」（/watch）＝カードの主は体験の開始に統一。
 * 「ボタン作成」（狙い撃ち）は動画詳細ページの副アクションが正式な入口。
 * ログイン状態は見ない（session 非依存）: 認証は目的地（/watch）の
 * ProtectedRoute（callbackPath 付き）が正本で、カードはポインタに徹する。
 * これにより per-user 状態を SSR に焼かず、セッション解決待ちのラベルちらつきも起きない。
 */
export default function VideoCardActions({ video, variant }: VideoCardActionsProps) {
	const detailLink = (
		<Button
			size="sm"
			variant="outline"
			className="flex-1 border text-muted-foreground hover:bg-accent min-h-[44px] text-sm"
			render={
				<Link href={`/videos/${video.id}`} aria-describedby={`video-title-${video.id}`}>
					<Eye className="h-4 w-4 mr-1" aria-hidden="true" />
					詳細を見る
				</Link>
			}
		/>
	);

	if (variant === "sidebar") {
		return (
			<Button
				variant="outline"
				size="sm"
				className="w-full border text-muted-foreground hover:bg-accent min-h-[44px]"
				render={
					<Link href={`/videos/${video.id}`} aria-describedby={`video-title-${video.id}`}>
						<ExternalLink className="h-4 w-4 mr-2" aria-hidden="true" />
						動画を見る
					</Link>
				}
			/>
		);
	}

	const gate = evaluateMarkGate(video);

	let markAction: ReactNode;
	if (gate.mode === "disabled") {
		// 事実の通知としての無効化: aria-disabled で理由を提示。
		// native disabled は pointer-events-none で title ツールチップが出ず、
		// フォーカスもできないため、aria-disabled でホバー/フォーカス両方に理由を届かせる。
		markAction = (
			<Button
				type="button"
				size="sm"
				variant="default"
				className="flex-1 min-h-[44px] text-sm opacity-50 cursor-not-allowed hover:bg-primary"
				aria-disabled="true"
				title={gate.reason}
				aria-label={`マーキングできません: ${gate.reason}`}
			>
				<Bookmark className="h-4 w-4 mr-1" aria-hidden="true" />
				マークして見る
			</Button>
		);
	} else {
		const spec = MARK_VARIANTS[gate.mode];
		const Icon = spec.icon;
		markAction = (
			<Button
				size="sm"
				variant={spec.variant}
				className={spec.className}
				render={
					<Link
						href={`/watch?v=${video.videoId}`}
						aria-label={`${video.title}${spec.ariaSuffix}`}
						className="flex items-center whitespace-nowrap"
					>
						<Icon className="h-4 w-4 mr-1" aria-hidden="true" />
						{spec.label}
					</Link>
				}
			/>
		);
	}

	return (
		<fieldset className="flex gap-2" aria-label="動画アクション">
			{detailLink}
			{markAction}
		</fieldset>
	);
}
