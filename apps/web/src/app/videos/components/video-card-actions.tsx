"use client";

import type { VideoPlainObject } from "@suzumina.click/shared-types";
import {
	canCreateAudioButton,
	getAudioButtonCreationErrorMessage,
} from "@suzumina.click/shared-types";
import { Button } from "@suzumina.click/ui/components/ui/button";
import { ExternalLink, Eye, LogIn, Plus } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import type { ReactNode } from "react";

interface VideoCardActionsProps {
	video: VideoPlainObject;
	variant: "grid" | "sidebar";
}

type ButtonGate =
	| { canCreate: true }
	| { canCreate: false; needsLogin: true }
	| { canCreate: false; needsLogin: false; reason: string };

function evaluateButtonGate(video: VideoPlainObject, isLoggedIn: boolean): ButtonGate {
	if (!isLoggedIn) {
		return { canCreate: false, needsLogin: true };
	}
	if (video.status?.embeddable === false) {
		return {
			canCreate: false,
			needsLogin: false,
			reason: "この動画は埋め込みが制限されているため、音声ボタンを作成できません",
		};
	}
	if (!canCreateAudioButton(video)) {
		return {
			canCreate: false,
			needsLogin: false,
			reason:
				getAudioButtonCreationErrorMessage(video) ||
				"音声ボタンを作成できるのは配信アーカイブのみです",
		};
	}
	return { canCreate: true };
}

/**
 * VideoCard のアクション領域（client island）。
 * 認証ゲート（useSession）をカード本体から隔離するための最小 client コンポーネント。
 */
export default function VideoCardActions({ video, variant }: VideoCardActionsProps) {
	const { data: session } = useSession();

	const detailLink = (
		<Button
			size="sm"
			variant="outline"
			className="flex-1 border text-muted-foreground hover:bg-accent min-h-[44px] text-sm"
			asChild
		>
			<Link href={`/videos/${video.id}`} aria-describedby={`video-title-${video.id}`}>
				<Eye className="h-4 w-4 mr-1" aria-hidden="true" />
				詳細を見る
			</Link>
		</Button>
	);

	if (variant === "sidebar") {
		return (
			<Button
				variant="outline"
				size="sm"
				className="w-full border text-muted-foreground hover:bg-accent min-h-[44px]"
				asChild
			>
				<Link href={`/videos/${video.id}`} aria-describedby={`video-title-${video.id}`}>
					<ExternalLink className="h-4 w-4 mr-2" aria-hidden="true" />
					動画を見る
				</Link>
			</Button>
		);
	}

	const gate = evaluateButtonGate(video, Boolean(session?.user));

	let createAction: ReactNode;
	if (gate.canCreate) {
		createAction = (
			<Button size="sm" variant="default" className="flex-1 min-h-[44px] text-sm" asChild>
				<Link
					href={`/buttons/create?video_id=${video.id}`}
					aria-label={`${video.title}の音声ボタンを作成`}
					className="flex items-center whitespace-nowrap"
				>
					<Plus className="h-4 w-4 mr-1" aria-hidden="true" />
					ボタン作成
				</Link>
			</Button>
		);
	} else if (gate.needsLogin) {
		// 未ログイン: ログイン導線を出す
		createAction = (
			<Button size="sm" variant="default" className="flex-1 min-h-[44px] text-sm" asChild>
				<Link
					href={`/auth/signin?callbackUrl=${encodeURIComponent(`/buttons/create?video_id=${video.id}`)}`}
					aria-label="ログインして音声ボタンを作成"
					className="flex items-center whitespace-nowrap"
				>
					<LogIn className="h-4 w-4 mr-1" aria-hidden="true" />
					ログイン
				</Link>
			</Button>
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
