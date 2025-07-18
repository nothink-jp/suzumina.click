"use client";

import type { CreateAudioButtonInput } from "@suzumina.click/shared-types";
import { YouTubePlayer, type YTPlayer } from "@suzumina.click/ui/components/custom/youtube-player";
import { Button } from "@suzumina.click/ui/components/ui/button";
import { Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useRef, useState } from "react";
import { createAudioButton } from "@/app/buttons/actions";
import { useTimeAdjustment } from "@/hooks/use-time-adjustment";
import { BasicInfoPanel } from "./basic-info-panel";
import { DebugPanel, useDebugHistory } from "./debug-panel";
import { TimeControlPanel } from "./time-control-panel";
import { UsageGuide } from "./usage-guide";

interface AudioButtonCreatorProps {
	videoId: string;
	videoTitle: string;
	videoDuration?: number;
	initialStartTime?: number;
}

export function AudioButtonCreator({
	videoId,
	videoTitle,
	videoDuration = 600,
	initialStartTime = 0,
}: AudioButtonCreatorProps) {
	const router = useRouter();

	// 基本情報の状態
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [tags, setTags] = useState<string[]>([]);
	const [isCreating, setIsCreating] = useState(false);
	const [error, setError] = useState("");
	// currentTimeは直接管理（useTimeAdjustmentを使わない）
	const [currentTime, setCurrentTime] = useState(Math.round(initialStartTime * 10) / 10);

	// YouTube Player参照
	const youtubePlayerRef = useRef<YTPlayer | null>(null);
	const lastTimeRef = useRef<number>(Math.round(initialStartTime * 10) / 10);

	// デバッグ機能
	const { debugMode, debugHistory, toggleDebugMode, addDebugEntry, clearHistory } =
		useDebugHistory();

	// 時間調整機能（currentTimeを含める）
	const timeAdjustmentProps = useMemo(
		() => ({
			videoDuration,
			currentTime,
			youtubePlayerRef,
			debugMode,
			onDebugLog: addDebugEntry,
		}),
		[videoDuration, currentTime, debugMode, addDebugEntry],
	);

	const timeAdjustment = useTimeAdjustment(timeAdjustmentProps);

	// YouTube Playerハンドラー
	const handlePlayerReady = useCallback((player: YTPlayer) => {
		youtubePlayerRef.current = player;
	}, []);

	const handleTimeUpdate = useCallback((time: number) => {
		// 数値チェックとデバウンス（元の実装を復元）
		if (typeof time === "number" && !Number.isNaN(time) && Number.isFinite(time)) {
			const roundedTime = Math.round(time * 10) / 10;
			// 前回と同じ値なら更新をスキップ（0.1秒精度）
			if (Math.abs(lastTimeRef.current - roundedTime) >= 0.1) {
				lastTimeRef.current = roundedTime;
				// 直接状態を更新
				setCurrentTime(roundedTime);
			}
		}
	}, []);

	// プレビュー再生
	const previewRange = useCallback(() => {
		if (youtubePlayerRef.current) {
			youtubePlayerRef.current.seekTo(timeAdjustment.startTime);
			youtubePlayerRef.current.playVideo();

			setTimeout(
				() => {
					if (youtubePlayerRef.current) {
						youtubePlayerRef.current.pauseVideo();
					}
				},
				(timeAdjustment.endTime - timeAdjustment.startTime) * 1000,
			);
		}
	}, [timeAdjustment.startTime, timeAdjustment.endTime]);

	// バリデーション
	const duration = Math.round((timeAdjustment.endTime - timeAdjustment.startTime) * 10) / 10;
	const isValid =
		title.trim().length > 0 &&
		timeAdjustment.startTime < timeAdjustment.endTime &&
		duration >= 1 &&
		duration <= 60;

	// 作成処理
	const handleCreate = useCallback(async () => {
		if (!isValid) return;

		setIsCreating(true);
		setError("");

		try {
			const input: CreateAudioButtonInput = {
				sourceVideoId: videoId,
				title: title.trim(),
				description: description.trim() || undefined,
				tags,
				startTime: timeAdjustment.startTime,
				endTime: timeAdjustment.endTime,
				isPublic: true,
			};

			const result = await createAudioButton(input);

			if (result.success) {
				router.push(`/buttons/${result.data.id}`);
			} else {
				setError(result.error || "作成に失敗しました");
			}
		} catch (_error) {
			setError("予期しないエラーが発生しました");
		} finally {
			setIsCreating(false);
		}
	}, [
		isValid,
		videoId,
		title,
		description,
		tags,
		timeAdjustment.startTime,
		timeAdjustment.endTime,
		router,
	]);

	// 時間調整用のハンドラー
	const timeHandlers = {
		onStartTimeInputChange: (value: string) => {
			timeAdjustment.setStartTimeInput(value);
			timeAdjustment.setIsEditingStartTime(true);
		},
		onEndTimeInputChange: (value: string) => {
			timeAdjustment.setEndTimeInput(value);
			timeAdjustment.setIsEditingEndTime(true);
		},
		onStartTimeBlur: () => {
			const timeInSeconds = timeAdjustment.parseTimeString(timeAdjustment.startTimeInput);
			if (timeInSeconds !== null) {
				timeAdjustment.setStartTime(Math.round(timeInSeconds * 10) / 10);
			}
			timeAdjustment.setIsEditingStartTime(false);
		},
		onEndTimeBlur: () => {
			const timeInSeconds = timeAdjustment.parseTimeString(timeAdjustment.endTimeInput);
			if (timeInSeconds !== null && timeInSeconds > timeAdjustment.startTime) {
				const newEndTime =
					Math.round(Math.min(timeInSeconds, timeAdjustment.startTime + 60) * 10) / 10;
				timeAdjustment.setEndTime(newEndTime);
			}
			timeAdjustment.setIsEditingEndTime(false);
		},
		onStartTimeKeyDown: (e: React.KeyboardEvent) => {
			if (e.key === "Enter") {
				(e.target as HTMLInputElement).blur();
			}
		},
		onEndTimeKeyDown: (e: React.KeyboardEvent) => {
			if (e.key === "Enter") {
				(e.target as HTMLInputElement).blur();
			}
		},
		onSetCurrentAsStart: timeAdjustment.setCurrentAsStart,
		onSetCurrentAsEnd: timeAdjustment.setCurrentAsEnd,
		onAdjustStartTime: timeAdjustment.adjustStartTime,
		onAdjustEndTime: timeAdjustment.adjustEndTime,
		onPreviewRange: previewRange,
	};

	return (
		<div className="min-h-screen bg-background">
			<div className="container mx-auto px-4 py-6">
				{/* ヘッダー */}
				<div className="mb-6">
					<h1 className="text-2xl font-bold mb-2">音声ボタンを作成</h1>
					<p className="text-muted-foreground text-sm">動画: {videoTitle}</p>
				</div>

				{/* エラー表示 */}
				{error && (
					<div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
						<p className="text-sm text-destructive">{error}</p>
					</div>
				)}

				{/* メインレイアウト: レスポンシブ対応 */}
				<div className="max-w-7xl mx-auto">
					<div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
						{/* 左側: YouTube動画プレイヤー (16:9で大きく表示) */}
						<div className="lg:col-span-1 xl:col-span-2">
							<div className="aspect-video bg-muted rounded-lg overflow-hidden shadow-lg">
								<YouTubePlayer
									videoId={videoId}
									onReady={handlePlayerReady}
									onTimeUpdate={handleTimeUpdate}
									startTime={initialStartTime}
									controls={true}
								/>
							</div>

							<UsageGuide />
						</div>

						{/* 右側: 操作パネル */}
						<div className="lg:col-span-1 xl:col-span-1 space-y-4">
							{/* 音声操作カード */}
							<div className="bg-card border rounded-lg p-4 lg:p-6 shadow-sm">
								<div className="flex items-center justify-between mb-4">
									<h3 className="text-lg font-semibold">音声操作</h3>
									<DebugPanel
										debugMode={debugMode}
										onToggleDebugMode={toggleDebugMode}
										debugHistory={debugHistory}
										onClearHistory={clearHistory}
									/>
								</div>

								<TimeControlPanel
									startTime={timeAdjustment.startTime}
									endTime={timeAdjustment.endTime}
									currentTime={currentTime}
									startTimeInput={timeAdjustment.startTimeInput}
									endTimeInput={timeAdjustment.endTimeInput}
									isEditingStartTime={timeAdjustment.isEditingStartTime}
									isEditingEndTime={timeAdjustment.isEditingEndTime}
									isAdjusting={timeAdjustment.isAdjusting}
									{...timeHandlers}
									isCreating={isCreating}
								/>
							</div>

							{/* 基本情報カード */}
							<BasicInfoPanel
								title={title}
								description={description}
								tags={tags}
								onTitleChange={setTitle}
								onDescriptionChange={setDescription}
								onTagsChange={setTags}
								disabled={isCreating}
							/>
						</div>

						{/* 下部: 作成ボタン（スマホ対応） */}
						<div className="col-span-full flex flex-col gap-4 mt-6 pt-6 border-t">
							<div className="flex flex-col sm:flex-row gap-3 w-full lg:justify-end">
								<Button
									variant="outline"
									onClick={() => router.back()}
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
