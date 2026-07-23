import type { VideoPlainObject } from "@suzumina.click/shared-types";
import {
	canCreateAudioButton,
	getAudioButtonCreationErrorMessage,
} from "@suzumina.click/shared-types";
import { Button } from "@suzumina.click/ui/components/ui/button";
import { Bookmark, Clock, ExternalLink, Eye, Plus } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

interface VideoCardActionsProps {
	video: VideoPlainObject;
	variant: "grid" | "sidebar";
}

type ButtonGate =
	| { canCreate: true }
	| { canCreate: false; liveMarking: "live" | "upcoming" }
	| { canCreate: false; reason: string };

function evaluateButtonGate(video: VideoPlainObject): ButtonGate {
	// 配信中/配信予定は「作成不可」ではなく配信中マーキング（/live）への導線に切り替える（SPR-146）。
	// この時間帯の正しい作成手段はマーク→アーカイブ後の仕上げのため。
	// 判定の正本はバッジ（video-badge.ts）と同じ _computed.videoType。raw の liveBroadcastContent は
	// stale がありうる（アーカイブ済みでも live のまま残る）。operations の isLive や _computed.isLive は
	// raw を OR しているため使わない — actualEndTime を見て archived を優先する videoType が唯一 stale に強い
	const { videoType } = video._computed;
	if (videoType === "live" || videoType === "possibly_live") {
		return { canCreate: false, liveMarking: "live" };
	}
	if (videoType === "upcoming") {
		return { canCreate: false, liveMarking: "upcoming" };
	}
	if (video.status?.embeddable === false) {
		return {
			canCreate: false,
			reason: "この動画は埋め込みが制限されているため、音声ボタンを作成できません",
		};
	}
	if (!canCreateAudioButton(video)) {
		return {
			canCreate: false,
			reason:
				getAudioButtonCreationErrorMessage(video) ||
				"音声ボタンを作成できるのは配信アーカイブのみです",
		};
	}
	return { canCreate: true };
}

/**
 * VideoCard のアクション領域。
 * ログイン状態は見ない（session 非依存）: 認証は各目的地（/live・/buttons/create）の
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

	const gate = evaluateButtonGate(video);

	let createAction: ReactNode;
	if (gate.canCreate) {
		createAction = (
			<Button
				size="sm"
				variant="default"
				className="flex-1 min-h-[44px] text-sm"
				render={
					<Link
						href={`/buttons/create?video_id=${video.id}`}
						aria-label={`${video.title}の音声ボタンを作成`}
						className="flex items-center whitespace-nowrap"
					>
						<Plus className="h-4 w-4 mr-1" aria-hidden="true" />
						ボタン作成
					</Link>
				}
			/>
		);
	} else if ("liveMarking" in gate) {
		// バッジと同色ペアで時制を明示する: live = destructive 赤（「配信中」バッジと同色・赤は live 専用）、
		// upcoming = info 青（「配信予告」バッジと同色）。待機ファンは配信前から /live で M キーを構えられる
		const isLiveNow = gate.liveMarking === "live";
		createAction = (
			<Button
				size="sm"
				variant={isLiveNow ? "destructive" : "default"}
				className={
					isLiveNow
						? "flex-1 min-h-[44px] text-sm"
						: "flex-1 min-h-[44px] text-sm bg-info text-info-foreground hover:bg-info/90"
				}
				render={
					<Link
						href={`/live?v=${video.videoId}`}
						aria-label={
							isLiveNow
								? `${video.title}の配信中マーキングを開く`
								: `${video.title}の配信待機（マーキング）を開く`
						}
						className="flex items-center whitespace-nowrap"
					>
						{isLiveNow ? (
							<Bookmark className="h-4 w-4 mr-1" aria-hidden="true" />
						) : (
							<Clock className="h-4 w-4 mr-1" aria-hidden="true" />
						)}
						{isLiveNow ? "配信中マーク" : "配信待機"}
					</Link>
				}
			/>
		);
	} else {
		// 作成不可（理由あり）: aria-disabled で理由を提示。
		// native disabled は pointer-events-none で title ツールチップが出ず、
		// フォーカスもできないため、aria-disabled でホバー/フォーカス両方に理由を届かせる。
		createAction = (
			<Button
				type="button"
				size="sm"
				variant="default"
				className="flex-1 min-h-[44px] text-sm opacity-50 cursor-not-allowed hover:bg-primary"
				aria-disabled="true"
				title={gate.reason}
				aria-label={`音声ボタンを作成できません: ${gate.reason}`}
			>
				<Plus className="h-4 w-4 mr-1" aria-hidden="true" />
				ボタン作成
			</Button>
		);
	}

	return (
		<fieldset className="flex gap-2" aria-label="動画アクション">
			{detailLink}
			{createAction}
		</fieldset>
	);
}
