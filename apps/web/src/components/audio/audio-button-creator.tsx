"use client";

import type { AudioButtonDraft, CreateAudioButtonInput } from "@suzumina.click/shared-types";
import { YouTubePlayer } from "@suzumina.click/ui/components/custom/youtube-player";
import { Button } from "@suzumina.click/ui/components/ui/button";
import { ExternalLink, Loader2, Plus, SkipForward } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { deleteButtonDraft } from "@/actions/button-drafts";
import { createAudioButton } from "@/app/buttons/actions";
import { useAudioButtonEditor } from "@/hooks/use-audio-button-editor";
import { trackCreateError, trackCreateStart, trackCreateSuccess } from "@/lib/analytics/events";
import { useSession } from "@/lib/auth/client";
import { formatSeconds } from "@/utils/format-seconds";
import { BasicInfoPanel } from "./basic-info-panel";
import { CreateButtonLimit } from "./create-button-limit";
import { MetaSuggestionPanel } from "./meta-suggestion-panel";
import { TimeControlPanel } from "./time-control-panel";
import { UsageGuide } from "./usage-guide";

interface AudioButtonCreatorProps {
	videoId: string;
	videoTitle: string;
	videoDuration?: number;
	initialStartTime?: number;
	/** /live の下書きから開いた場合の下書きID。作成成功時に消化（削除）する（SPR-146） */
	draftId?: string;
	/**
	 * 同一動画の下書きキュー（suggestedStartTime 昇順・現在の下書きを含む）。
	 * 作成成功後に遷移せず次の下書きへ進む連続仕上げに使う（SPR-266 第2段）
	 */
	videoDrafts?: AudioButtonDraft[];
}

/**
 * 音声ボタン作成フォーム。
 * フォーム値（タイトル/説明/タグ/開始・終了時刻）は useState で保持する。
 * 作成成功・キャンセルはいずれも create セグメント外（詳細ページ / 戻り先）へ遷移するため
 * この instance は unmount され、次に作成画面へ来たときは必ずまっさらに mount される。
 * 同一セグメントを別動画で再訪したときの値残留は page 側の `key`（videoId+startTime）で
 * remount して防ぐ（apps/web/src/app/buttons/create/page.tsx）。
 */
export function AudioButtonCreator({
	videoId,
	videoTitle,
	videoDuration = 600,
	initialStartTime = 0,
	draftId,
	videoDrafts,
}: AudioButtonCreatorProps) {
	const router = useRouter();
	const user = useSession();

	// 共通の音声ボタン編集ロジック
	const editor = useAudioButtonEditor({
		videoId,
		videoTitle,
		videoDuration,
		initialStartTime,
	});

	const { state, setState, youtubeManager, timeAdjustment, timeHandlers, validation } = editor;
	const { buttonText, description, tags, isProcessing: isCreating, error } = state;
	const {
		setButtonText,
		setDescription,
		setTags,
		setIsProcessing: setIsCreating,
		setError,
	} = setState;
	const isValid = validation.isValid;

	// 連続仕上げの状態（SPR-266 第2段）。activeDraftId が「今仕上げている下書き」の正本で、
	// prop の draftId は初期値にすぎない（キューを進むと変わる）
	const [activeDraftId, setActiveDraftId] = useState(draftId);
	const [remainingDrafts, setRemainingDrafts] = useState<AudioButtonDraft[]>(() =>
		(videoDrafts ?? []).filter((draft) => draft.id !== draftId),
	);
	const [lastCreated, setLastCreated] = useState<{ id: string; buttonText: string } | null>(null);

	// 次の下書きへフォームとプレイヤーを進める（遷移なし＝プレイヤー維持が連続仕上げの本体）
	const { setStartTime, setEndTime } = timeAdjustment;
	const { seekTo, videoDuration: playerDuration } = youtubeManager;
	const advanceToDraft = useCallback(
		(next: AudioButtonDraft) => {
			const duration = playerDuration || videoDuration;
			// VOD は末尾が最大 ~20s 短くなる場合があるため終端付近はクランプ（SPR-145 実測）
			const start = Math.min(next.suggestedStartTime, Math.max(0, duration - 1));
			const end = Math.min(start + 10, duration);
			setActiveDraftId(next.id);
			setButtonText("");
			setDescription("");
			setTags([]);
			setError("");
			setStartTime(start);
			setEndTime(end);
			seekTo(start);
		},
		[
			playerDuration,
			videoDuration,
			setButtonText,
			setDescription,
			setTags,
			setError,
			setStartTime,
			setEndTime,
			seekTo,
		],
	);

	// スキップ: 現在の下書きは消化せず（/live から再度仕上げられる）次へ進む
	const handleSkip = useCallback(() => {
		const [next, ...rest] = remainingDrafts;
		if (!next) return;
		setRemainingDrafts(rest);
		advanceToDraft(next);
	}, [remainingDrafts, advanceToDraft]);

	// 作成処理
	const handleCreate = useCallback(async () => {
		if (!isValid) return;

		setIsCreating(true);
		setError("");
		trackCreateStart(videoId, Boolean(activeDraftId));

		try {
			const input: CreateAudioButtonInput = {
				videoId: videoId,
				videoTitle: videoTitle,
				buttonText: buttonText.trim(),
				tags,
				startTime: timeAdjustment.startTime,
				endTime: timeAdjustment.endTime,
				isPublic: true,
			};

			const result = await createAudioButton(input);

			if (result.success) {
				trackCreateSuccess({
					audioButtonId: result.data.id,
					videoId,
					fromDraft: Boolean(activeDraftId),
				});
				// 下書きから開いた場合は消化（削除）する。ベストエフォート＝失敗してもボタン作成は
				// 成立しているため遷移を止めない（残った下書きは /live から手動削除できる）。
				if (activeDraftId) {
					await deleteButtonDraft(activeDraftId).catch(() => undefined);
				}
				// 連続仕上げ: 同一動画の下書きが残っていれば遷移せず次へ（プレイヤー維持・SPR-266）
				const [next, ...rest] = remainingDrafts;
				if (next) {
					setLastCreated({ id: result.data.id, buttonText: buttonText.trim() });
					setRemainingDrafts(rest);
					advanceToDraft(next);
					setIsCreating(false);
					return;
				}
				// 詳細ページへフルロード遷移（SPR-252）。router.push だと /buttons ツリー内の soft nav が
				// @modal にインターセプトされ、作成フォームの上にクイックビューが重なってしまう
				// （フォーム instance も破棄されず「作成中…」が固着する）。フルロードなら
				// フル詳細ページ表示と instance 破棄の両方が保証される。
				// 遷移完了まで「作成中…」を維持し、フォームを空白化しない（ちらつき防止）。
				window.location.href = `/buttons/${result.data.id}`;
				return;
			}

			trackCreateError(videoId, result.error || "unknown");
			setError(result.error || "作成に失敗しました");
			setIsCreating(false);
		} catch (_error) {
			trackCreateError(videoId, "unexpected");
			setError("予期しないエラーが発生しました");
			setIsCreating(false);
		}
	}, [
		isValid,
		videoId,
		buttonText,
		tags,
		timeAdjustment.startTime,
		timeAdjustment.endTime,
		setIsCreating,
		setError,
		videoTitle,
		activeDraftId,
		remainingDrafts,
		advanceToDraft,
	]);

	// 時間調整用のハンドラーは共通フックから取得

	return (
		<div className="min-h-screen bg-background">
			<div className="container mx-auto px-4 py-6">
				<div className="mb-6">
					<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
						<div>
							<h1 className="text-2xl font-bold mb-2">音声ボタンを作成</h1>
							<p className="text-muted-foreground text-sm">動画: {videoTitle}</p>
						</div>
						{user?.discordId && (
							<div className="sm:min-w-[280px]">
								<CreateButtonLimit userId={user.discordId} />
							</div>
						)}
					</div>
				</div>

				{error && (
					<div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
						<p className="text-sm text-destructive">{error}</p>
					</div>
				)}

				<div className="max-w-7xl mx-auto">
					<div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
						<div className="lg:col-span-1 xl:col-span-2">
							<div className="aspect-video bg-muted rounded-lg overflow-hidden shadow-lg">
								<YouTubePlayer
									videoId={youtubeManager.videoId}
									onReady={(player) => {
										youtubeManager.youtubePlayerRef.current = player;
										youtubeManager.onPlayerReady();
									}}
									onStateChange={youtubeManager.onPlayerStateChange}
									startTime={initialStartTime}
									controls={true}
								/>
							</div>

							<UsageGuide />
						</div>

						<div className="lg:col-span-1 xl:col-span-1 space-y-4">
							{lastCreated && (
								<div className="p-3 bg-primary/10 border border-primary/20 rounded-lg text-sm flex items-center justify-between gap-2">
									<span className="min-w-0 truncate">
										「{lastCreated.buttonText}」を作成しました
									</span>
									{/* 連続仕上げを中断しないよう新規タブで開く */}
									<a
										href={`/buttons/${lastCreated.id}`}
										target="_blank"
										rel="noopener noreferrer"
										className="flex items-center gap-1 text-primary hover:underline whitespace-nowrap"
									>
										<ExternalLink className="h-3.5 w-3.5" />
										開く
									</a>
								</div>
							)}

							{activeDraftId && (videoDrafts?.length ?? 0) > 1 && (
								<div className="bg-card border rounded-lg p-4 shadow-sm text-sm space-y-2">
									<div className="flex items-center justify-between">
										<span className="font-medium">仕上げキュー</span>
										<span className="text-muted-foreground">残り {remainingDrafts.length} 件</span>
									</div>
									{remainingDrafts[0] ? (
										<div className="flex items-center justify-between gap-2">
											<span className="text-muted-foreground">
												次: {formatSeconds(remainingDrafts[0].suggestedStartTime)} 付近
											</span>
											<Button
												size="sm"
												variant="ghost"
												onClick={handleSkip}
												disabled={isCreating}
												className="whitespace-nowrap"
											>
												<SkipForward className="h-3.5 w-3.5 mr-1" />
												スキップして次へ
											</Button>
										</div>
									) : (
										<p className="text-muted-foreground">
											これが最後の下書きです。作成すると詳細ページへ移動します。
										</p>
									)}
								</div>
							)}

							<div className="bg-card border rounded-lg p-4 lg:p-6 shadow-sm">
								<div className="mb-4">
									<h3 className="text-lg font-semibold">音声操作</h3>
								</div>

								<TimeControlPanel
									startTime={timeAdjustment.startTime}
									endTime={timeAdjustment.endTime}
									currentTime={youtubeManager.currentTime}
									startTimeInput={timeAdjustment.startTimeInput}
									endTimeInput={timeAdjustment.endTimeInput}
									isEditingStartTime={timeAdjustment.isEditingStartTime}
									isEditingEndTime={timeAdjustment.isEditingEndTime}
									isAdjusting={timeAdjustment.isAdjusting}
									{...timeHandlers}
									isCreating={isCreating}
								/>
							</div>

							<MetaSuggestionPanel
								videoId={videoId}
								startTime={timeAdjustment.startTime}
								endTime={timeAdjustment.endTime}
								disabled={isCreating}
								currentTags={tags}
								onSelectTitle={setButtonText}
								onAddTag={(tag) => {
									// バリデーション上限（10個）内でのみ追加。重複はパネル側で disabled 済み
									if (!tags.includes(tag) && tags.length < 10) {
										setTags([...tags, tag]);
									}
								}}
							/>

							<BasicInfoPanel
								title={buttonText}
								description={description}
								tags={tags}
								onTitleChange={setButtonText}
								onDescriptionChange={setDescription}
								onTagsChange={setTags}
								disabled={isCreating}
							/>
						</div>

						<div className="col-span-full flex flex-col gap-4 mt-6 pt-6 border-t">
							<div className="flex flex-col sm:flex-row gap-3 w-full lg:justify-end">
								<Button
									variant="outline"
									onClick={() => {
										router.back();
									}}
									disabled={isCreating}
									className="w-full sm:w-auto min-h-[44px] order-2 sm:order-1"
								>
									キャンセル
								</Button>
								<Button
									onClick={handleCreate}
									disabled={!isValid || isCreating}
									className="w-full sm:w-auto min-h-[44px] h-11 sm:h-12 px-6 sm:px-8 order-1 sm:order-2"
									size="lg"
								>
									{isCreating ? (
										<>
											<Loader2 className="h-4 w-4 mr-2 animate-spin" />
											作成中...
										</>
									) : (
										<>
											<Plus className="h-4 w-4 mr-2" />
											音声ボタンを作成
										</>
									)}
								</Button>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
