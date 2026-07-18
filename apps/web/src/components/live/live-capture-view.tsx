"use client";

import type { AudioButtonDraft, VideoPlainObject } from "@suzumina.click/shared-types";
import { YouTubePlayer } from "@suzumina.click/ui/components/custom/youtube-player";
import type { YTPlayer } from "@suzumina.click/ui/components/custom/youtube-types";
import { Badge } from "@suzumina.click/ui/components/ui/badge";
import { Button } from "@suzumina.click/ui/components/ui/button";
import { Input } from "@suzumina.click/ui/components/ui/input";
import { Bookmark, ExternalLink, Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createButtonDraft, deleteButtonDraft } from "@/actions/button-drafts";
import { trackMarkDraft } from "@/lib/analytics/events";
import { matchShortcutKey } from "@/lib/keyboard-shortcut";
import { formatSeconds } from "@/utils/format-seconds";
import { groupDraftsByVideo } from "./draft-groups";

interface LiveCaptureViewProps {
	video: VideoPlainObject | null;
	initialDrafts: AudioButtonDraft[];
}

const VIDEO_ID_PATTERN = /(?:v=|youtu\.be\/|\/live\/|\/embed\/|\/shorts\/)([A-Za-z0-9_-]{11})/;

function parseVideoIdInput(value: string): string | null {
	const trimmed = value.trim();
	const match = trimmed.match(VIDEO_ID_PATTERN);
	if (match?.[1]) {
		return match[1];
	}
	return /^[A-Za-z0-9_-]{11}$/.test(trimmed) ? trimmed : null;
}

function formatMarkedAt(iso: string): string {
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) {
		return "";
	}
	return date.toLocaleString("ja-JP", {
		month: "numeric",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

/**
 * 配信中マーキング画面（SPR-146 第1段）。
 *
 * SPR-145 の計測ハーネスの製品版: マーク時に playerTime（主信号）と壁時計（フォールバック）を
 * 下書きとして保存する。プレイヤーが使えない場合も壁時計のみで保存を継続する（劣化モード）。
 */
export function LiveCaptureView({ video, initialDrafts }: LiveCaptureViewProps) {
	const router = useRouter();
	const [drafts, setDrafts] = useState<AudioButtonDraft[]>(initialDrafts);
	// 動画単位のキュー表示（SPR-266 第2段）。直近の配信グループが先頭
	const draftGroups = useMemo(() => groupDraftsByVideo(drafts), [drafts]);
	const [isMarking, setIsMarking] = useState(false);
	const [error, setError] = useState("");
	const [manualInput, setManualInput] = useState("");
	const [justMarked, setJustMarked] = useState(false);
	const playerRef = useRef<YTPlayer | null>(null);

	// 判定の正本は _computed.videoType（video-card-actions / video-badge と同一。raw は stale がありうる）
	const videoType = video?._computed.videoType;
	const isLiveNow = videoType === "live" || videoType === "possibly_live";
	const isUpcoming = videoType === "upcoming";

	const handleMark = useCallback(async () => {
		// isMarking ガードは M キーの素早い2連打による二重作成防止（ボタンの disabled では keydown を防げない）
		if (!video || isMarking) {
			return;
		}
		setIsMarking(true);
		setError("");

		// 主信号 = プレイヤー再生位置。取得失敗時は null（壁時計のみモード）で保存を続行する
		let playerTime: number | null = null;
		try {
			const t = playerRef.current?.getCurrentTime?.();
			if (typeof t === "number" && Number.isFinite(t) && t >= 0) {
				playerTime = Math.round(t * 1000) / 1000;
			}
		} catch {
			// noop: 劣化モードへ
		}

		try {
			const result = await createButtonDraft({
				videoId: video.videoId,
				videoTitle: video.title,
				playerTime,
				markedAtMs: Date.now(),
			});

			if (result.success) {
				setDrafts((prev) => [result.data, ...prev]);
				trackMarkDraft(video.videoId, playerTime != null);
				setJustMarked(true);
				setTimeout(() => setJustMarked(false), 600);
			} else {
				setError(result.error);
			}
		} catch {
			setError("下書きの保存に失敗しました");
		} finally {
			setIsMarking(false);
		}
	}, [video, isMarking]);

	// M キーでマーク。ガードの正本は matchShortcutKey（create/edit の I/O キーと共通・SPR-266）
	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			if (matchShortcutKey(event, ["m"]) === null) {
				return;
			}
			event.preventDefault();
			void handleMark();
		};
		document.addEventListener("keydown", onKeyDown);
		return () => document.removeEventListener("keydown", onKeyDown);
	}, [handleMark]);

	const handleDelete = useCallback(async (draftId: string) => {
		const result = await deleteButtonDraft(draftId);
		if (result.success) {
			setDrafts((prev) => prev.filter((d) => d.id !== draftId));
		} else {
			setError(result.error ?? "下書きの削除に失敗しました");
		}
	}, []);

	const handleManualSubmit = useCallback(() => {
		const videoId = parseVideoIdInput(manualInput);
		if (!videoId) {
			setError("動画の URL または ID（11文字）を入力してください");
			return;
		}
		setError("");
		router.push(`/live?v=${videoId}`);
	}, [manualInput, router]);

	return (
		<div className="container mx-auto px-4 py-6 max-w-4xl space-y-6">
			<div>
				<h1 className="text-2xl font-bold mb-1">配信中マーキング</h1>
				<p className="text-sm text-muted-foreground">
					「ここ！」と思った瞬間にマーク（M
					キー）。アーカイブ公開後、下書きから音声ボタンに仕上げられます。
				</p>
			</div>

			{error && (
				<div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
					<p className="text-sm text-destructive">{error}</p>
				</div>
			)}

			{video ? (
				<div className="space-y-3">
					<div className="flex items-center gap-2 flex-wrap">
						{isLiveNow && <Badge variant="destructive">配信中</Badge>}
						{isUpcoming && <Badge variant="secondary">配信予定</Badge>}
						{!isLiveNow && !isUpcoming && <Badge variant="outline">アーカイブ</Badge>}
						<span className="text-sm font-medium truncate">{video.title}</span>
					</div>

					<div className="aspect-video bg-muted rounded-lg overflow-hidden shadow-lg">
						<YouTubePlayer
							videoId={video.videoId}
							controls={true}
							onReady={(player) => {
								playerRef.current = player;
							}}
						/>
					</div>

					<Button
						onClick={handleMark}
						disabled={isMarking}
						size="lg"
						className={`w-full min-h-[56px] text-lg font-bold transition-colors ${
							justMarked ? "bg-green-600 hover:bg-green-600" : ""
						}`}
					>
						{isMarking ? (
							<Loader2 className="h-5 w-5 mr-2 animate-spin" />
						) : (
							<Bookmark className="h-5 w-5 mr-2" />
						)}
						{justMarked ? "マークしました" : "ここをマーク（M）"}
					</Button>

					{isUpcoming && (
						<p className="text-xs text-muted-foreground">
							配信開始前です。開始後にプレイヤーが再生されてからマークしてください。
						</p>
					)}
				</div>
			) : (
				<div className="border rounded-lg p-6 space-y-4 text-center">
					<p className="text-muted-foreground">現在、配信中・配信予定の動画が見つかりません。</p>
					<div className="flex gap-2 max-w-md mx-auto">
						<Input
							value={manualInput}
							onChange={(e) => setManualInput(e.target.value)}
							placeholder="動画の URL または ID を直接指定"
							onKeyDown={(e) => {
								if (e.key === "Enter") {
									handleManualSubmit();
								}
							}}
						/>
						<Button onClick={handleManualSubmit} variant="outline">
							表示
						</Button>
					</div>
				</div>
			)}

			<div className="space-y-3">
				<h2 className="text-lg font-semibold">
					下書き
					{drafts.length > 0 && (
						<span className="ml-2 text-sm font-normal text-muted-foreground">
							{drafts.length}件
						</span>
					)}
				</h2>

				{drafts.length === 0 ? (
					<p className="text-sm text-muted-foreground">
						まだ下書きがありません。配信中にマークするとここに溜まります。
					</p>
				) : (
					<div className="space-y-4">
						{draftGroups.map((group) => {
							// 配信中/配信予定の動画はまだ仕上げられない（判定はグループ単位で足りる）
							const isCurrentLiveVideo =
								group.videoId === video?.videoId && (isLiveNow || isUpcoming);
							const firstDraft = group.drafts[0];
							return (
								<div key={group.videoId} className="border rounded-lg overflow-hidden">
									<div className="flex items-center gap-3 p-3 bg-muted/40 border-b">
										<div className="min-w-0 flex-1">
											<p className="text-sm font-medium truncate">{group.videoTitle}</p>
											<p className="text-xs text-muted-foreground">
												{group.drafts.length}件の下書き
											</p>
										</div>
										{isCurrentLiveVideo ? (
											<span className="text-xs text-muted-foreground whitespace-nowrap">
												アーカイブ公開後に仕上げ
											</span>
										) : (
											firstDraft && (
												<Button asChild size="sm">
													{/* /buttons ツリーへの遷移はフルロード（intercepting route 回避・SPR-252）。
													    先頭の下書きから開けば同一動画のキューは create 側が読み込み、
													    連続仕上げ（SPR-266 第2段）につながる */}
													<a
														href={`/buttons/create?video_id=${group.videoId}&start_time=${firstDraft.suggestedStartTime}&draft_id=${firstDraft.id}`}
													>
														<ExternalLink className="h-3.5 w-3.5 mr-1" />
														まとめて仕上げる
													</a>
												</Button>
											)
										)}
									</div>
									<ul className="divide-y">
										{group.drafts.map((draft) => (
											<li key={draft.id} className="flex items-center gap-3 p-3">
												<div className="min-w-0 flex-1">
													<p className="text-sm font-medium">
														{formatSeconds(draft.suggestedStartTime)} から
														{draft.playerTime == null && (
															<span className="ml-2 text-xs text-amber-600">
																壁時計のみ・要頭出し
															</span>
														)}
													</p>
													<p className="text-xs text-muted-foreground">
														{formatMarkedAt(draft.markedAt)}
													</p>
												</div>
												{!isCurrentLiveVideo && (
													<Button asChild size="sm" variant="outline">
														{/* この1件だけを仕上げたいときの個別導線（フルロード・SPR-252） */}
														<a
															href={`/buttons/create?video_id=${draft.videoId}&start_time=${draft.suggestedStartTime}&draft_id=${draft.id}`}
														>
															<ExternalLink className="h-3.5 w-3.5 mr-1" />
															仕上げる
														</a>
													</Button>
												)}
												<Button
													size="sm"
													variant="ghost"
													aria-label="下書きを削除"
													onClick={() => void handleDelete(draft.id)}
												>
													<Trash2 className="h-4 w-4" />
												</Button>
											</li>
										))}
									</ul>
								</div>
							);
						})}
					</div>
				)}
			</div>
		</div>
	);
}
