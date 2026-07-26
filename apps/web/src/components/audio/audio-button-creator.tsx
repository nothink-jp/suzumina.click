"use client";

import type { AudioButtonDraft, CreateAudioButtonInput } from "@suzumina.click/shared-types";
import { YouTubePlayer } from "@suzumina.click/ui/components/custom/youtube-player";
import { Button } from "@suzumina.click/ui/components/ui/button";
import { ExternalLink, SkipForward } from "lucide-react";
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
import { CreationActionBar } from "./creation-action-bar";
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
	/** この動画の作成済みボタンの開始時刻（探索レーンの目印・SPR-289） */
	madeMarks?: number[];
	/** 自分の下書きの開始時刻（探索レーンの目印・SPR-289）。キューとは独立に常時渡る */
	draftMarks?: number[];
}

/** 同値が複数あっても1件分だけ取り除く（下書きマークは同時刻が並存しうる） */
function removeOneOccurrence(list: number[], value: number): number[] {
	const index = list.indexOf(value);
	if (index === -1) return list;
	return [...list.slice(0, index), ...list.slice(index + 1)];
}

/**
 * 音声ボタン作成フォーム。
 * フォーム値（タイトル/説明/タグ/開始・終了時刻）は useState で保持する。
 * 「作成」・キャンセルは create セグメント外（詳細ページ / 戻り先）へ遷移して instance が
 * unmount される。一方「作成して次を切り抜く」と下書きキュー進行（SPR-266/290）は遷移せず
 * 残留するため、フォーム値のリセットは finishAfterCreate / advanceToDraft が明示的に行う。
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
	madeMarks: initialMadeMarks,
	draftMarks,
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

	const { state, setState, youtubeManager, timeAdjustment, timeHandlers, audition, validation } =
		editor;
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

	// 探索レーンのマーク。作成成功時にその場で加減する（再取得はしない・SPR-289）。
	// 下書きマークも state 化しないと、連続仕上げ（遷移なし）で消化した下書きが残って見える
	const [madeMarks, setMadeMarks] = useState<number[]>(() => initialMadeMarks ?? []);
	const [draftMarkList, setDraftMarkList] = useState<number[]>(() => draftMarks ?? []);

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

	// 下書きの消化: 削除（ベストエフォート）＋探索レーンのマーク除去。
	// 削除 API の成否に関わらずボタン作成は成立している＝「未処理」表示のまま残すほうが誤誘導になる
	const consumeActiveDraft = useCallback(async () => {
		if (!activeDraftId) return;
		await deleteButtonDraft(activeDraftId).catch(() => undefined);
		const consumed = videoDrafts?.find((draft) => draft.id === activeDraftId);
		if (consumed) {
			setDraftMarkList((prev) => removeOneOccurrence(prev, consumed.suggestedStartTime));
		}
	}, [activeDraftId, videoDrafts]);

	// スキップ: 現在の下書きは消化せず（/live から再度仕上げられる）次へ進む
	const handleSkip = useCallback(() => {
		const [next, ...rest] = remainingDrafts;
		if (!next) return;
		setRemainingDrafts(rest);
		advanceToDraft(next);
	}, [remainingDrafts, advanceToDraft]);

	// 作成成功後の行き先を1箇所に集約:
	// 1) 下書きキューが残っていれば次へ（SPR-266） 2) 「作成して次を切り抜く」なら残留（SPR-290）
	// 3) それ以外は詳細ページへフルロード遷移（SPR-252。router.push だと /buttons ツリー内の
	//    soft nav が @modal にインターセプトされフォームの上にクイックビューが重なる。
	//    遷移完了まで「作成中…」を維持し、フォームを空白化しない＝ちらつき防止）
	const finishAfterCreate = useCallback(
		(createdId: string, createdText: string, continueAfter: boolean) => {
			const [next, ...rest] = remainingDrafts;
			if (next) {
				setLastCreated({ id: createdId, buttonText: createdText });
				setRemainingDrafts(rest);
				advanceToDraft(next);
				setIsCreating(false);
				return;
			}
			if (continueAfter) {
				// 遷移せず同じ画面で次の切り抜きへ。時刻とプレイヤーは維持し、テキストだけ空にする
				// （次の切り抜き位置は探索レーンやシークで選ぶ想定）。
				// 下書き起点で来ていた場合もここで下書きは消化済み＝以降の作成は下書き由来ではない。
				// クリアしないと fromDraft の誤記録と消化済み下書きの再削除・マーク誤除去が起きる
				setActiveDraftId(undefined);
				setLastCreated({ id: createdId, buttonText: createdText });
				setButtonText("");
				setDescription("");
				setTags([]);
				setIsCreating(false);
				return;
			}
			window.location.href = `/buttons/${createdId}`;
		},
		[remainingDrafts, advanceToDraft, setIsCreating, setButtonText, setDescription, setTags],
	);

	// 作成処理。continueAfter=true は「作成して次を切り抜く」（SPR-290）
	const handleCreate = useCallback(
		async (continueAfter: boolean) => {
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
					// 探索レーンへ即時反映（連続作成時に同じ箇所の二重作成を防ぐ）
					setMadeMarks((prev) => [...prev, input.startTime]);
					// 下書きから開いた場合は消化する（残った下書きは /live から手動削除できる）
					await consumeActiveDraft();
					finishAfterCreate(result.data.id, input.buttonText, continueAfter);
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
		},
		[
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
			consumeActiveDraft,
			finishAfterCreate,
		],
	);

	// 作成できない理由（固定バーに併記する。disabled ボタンは tooltip が出ないため文言で示す）
	const disabledReason =
		validation.errors.title === "タイトルを入力してください"
			? "タイトルを入力すると作成できます"
			: (validation.errors.title ??
				validation.errors.timeRange ??
				validation.errors.duration ??
				validation.errors.tags ??
				validation.errors.description ??
				null);

	return (
		<div className="min-h-screen bg-background flex flex-col">
			<div className="container mx-auto px-4 py-6">
				{/* ヘッダーは1行に簡素化（SPR-290）。作成数はサマリーカード側（右カラム）へ */}
				<div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
					<h1 className="text-xl sm:text-2xl font-bold">音声ボタンを作成</h1>
					<p className="min-w-0 flex-1 truncate text-sm text-muted-foreground">{videoTitle}</p>
					<span className="text-xs text-muted-foreground whitespace-nowrap">
						{formatSeconds(youtubeManager.videoDuration || videoDuration)}
					</span>
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

							{/* トリムレーンは幅が要るためプレイヤー直下（左カラム）に置く（SPR-288） */}
							<div className="mt-4 bg-card border rounded-lg p-3 sm:p-4 shadow-sm">
								<TimeControlPanel
									startTime={timeAdjustment.startTime}
									endTime={timeAdjustment.endTime}
									currentTime={youtubeManager.currentTime}
									videoDuration={youtubeManager.videoDuration || videoDuration}
									startTimeInput={timeAdjustment.startTimeInput}
									endTimeInput={timeAdjustment.endTimeInput}
									isEditingStartTime={timeAdjustment.isEditingStartTime}
									isEditingEndTime={timeAdjustment.isEditingEndTime}
									{...timeHandlers}
									onSeek={youtubeManager.seekTo}
									audition={audition}
									madeMarks={madeMarks}
									draftMarks={draftMarkList}
									isCreating={isCreating}
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

							<BasicInfoPanel
								title={buttonText}
								description={description}
								tags={tags}
								onTitleChange={setButtonText}
								onDescriptionChange={setDescription}
								onTagsChange={setTags}
								disabled={isCreating}
								metaSuggestion={
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
								}
							/>

							{/* ヘッダーから移した作成上限と、この動画からのサマリー（SPR-289/290） */}
							{user?.discordId && <CreateButtonLimit userId={user.discordId} />}
							<div className="rounded-lg border bg-minase-100 p-3 text-minase-900">
								<div className="mb-1 text-xs font-semibold">この動画からの作成</div>
								<div className="text-xs">
									作成済み {madeMarks.length}個
									{draftMarkList.length > 0 && ` ・ 下書き ${draftMarkList.length}個`}
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* 固定アクションバー（SPR-290）。ラッパーで包むと sticky の可動域が潰れるため直下に置く */}
			<CreationActionBar
				startTime={timeAdjustment.startTime}
				endTime={timeAdjustment.endTime}
				disabledReason={disabledReason}
				isCreating={isCreating}
				showContinue={remainingDrafts.length === 0}
				onCancel={() => router.back()}
				onCreate={() => handleCreate(false)}
				onCreateAndContinue={() => handleCreate(true)}
			/>
		</div>
	);
}
