"use client";

import { type CreateAudioButtonInput, formatTimestamp } from "@suzumina.click/shared-types";
import { YouTubePlayer, type YTPlayer } from "@suzumina.click/ui/components/custom/youtube-player";
import { Badge } from "@suzumina.click/ui/components/ui/badge";
import { Button } from "@suzumina.click/ui/components/ui/button";
import { Input } from "@suzumina.click/ui/components/ui/input";
import { Textarea } from "@suzumina.click/ui/components/ui/textarea";
import { Clock, Loader2, MousePointer, Play, Plus, Tag, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useId, useRef, useState } from "react";
import { createAudioButton } from "@/app/buttons/actions";

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
	const titleId = useId();

	// 必須の状態のみ
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [tags, setTags] = useState<string[]>([]);
	const [tagInput, setTagInput] = useState("");
	const [startTime, setStartTime] = useState(Math.round(initialStartTime * 10) / 10);
	const [endTime, setEndTime] = useState(
		Math.round(Math.min(initialStartTime + 5, videoDuration) * 10) / 10,
	);
	const [currentTime, setCurrentTime] = useState(Math.round(initialStartTime * 10) / 10);
	const [isCreating, setIsCreating] = useState(false);
	const [error, setError] = useState("");

	// 編集中の時間文字列を管理
	const [startTimeInput, setStartTimeInput] = useState(
		formatTimestamp(Math.round(initialStartTime * 10) / 10),
	);
	const [endTimeInput, setEndTimeInput] = useState(
		formatTimestamp(Math.round(Math.min(initialStartTime + 5, videoDuration) * 10) / 10),
	);
	const [isEditingStartTime, setIsEditingStartTime] = useState(false);
	const [isEditingEndTime, setIsEditingEndTime] = useState(false);

	const youtubePlayerRef = useRef<YTPlayer | null>(null);
	const lastTimeRef = useRef<number>(Math.round(initialStartTime * 10) / 10);

	// 時間文字列をパースする関数
	const parseTimeString = useCallback((timeStr: string): number | null => {
		// 時:分:秒.小数 形式 (例: 1:23:45.6)
		const hourMatch = timeStr.match(/^(\d+):(\d{2}):(\d{2})\.(\d)$/);
		if (hourMatch?.[1] && hourMatch[2] && hourMatch[3] && hourMatch[4]) {
			const hours = Number.parseInt(hourMatch[1], 10);
			const minutes = Number.parseInt(hourMatch[2], 10);
			const seconds = Number.parseInt(hourMatch[3], 10);
			const decimal = Number.parseInt(hourMatch[4], 10);
			return hours * 3600 + minutes * 60 + seconds + decimal / 10;
		}

		// 分:秒.小数 形式 (例: 50:12.3)
		const minuteMatch = timeStr.match(/^(\d+):(\d{2})\.(\d)$/);
		if (minuteMatch?.[1] && minuteMatch[2] && minuteMatch[3]) {
			const minutes = Number.parseInt(minuteMatch[1], 10);
			const seconds = Number.parseInt(minuteMatch[2], 10);
			const decimal = Number.parseInt(minuteMatch[3], 10);
			return minutes * 60 + seconds + decimal / 10;
		}

		return null;
	}, []);

	// 時間調整関数
	const adjustStartTime = useCallback(
		(deltaSeconds: number) => {
			const newTime = Math.round((startTime + deltaSeconds) * 10) / 10;
			const clampedTime = Math.max(0, Math.min(newTime, videoDuration - 0.1));
			setStartTime(clampedTime);
			setStartTimeInput(formatTimestamp(clampedTime));

			// 終了時間が開始時間以下になる場合は調整
			if (endTime <= clampedTime) {
				const newEndTime = Math.round(Math.min(clampedTime + 5, videoDuration) * 10) / 10;
				setEndTime(newEndTime);
				setEndTimeInput(formatTimestamp(newEndTime));
			}
		},
		[startTime, endTime, videoDuration],
	);

	const adjustEndTime = useCallback(
		(deltaSeconds: number) => {
			const newTime = Math.round((endTime + deltaSeconds) * 10) / 10;
			const clampedTime = Math.max(
				startTime + 0.1,
				Math.min(newTime, Math.min(startTime + 60, videoDuration)),
			);
			setEndTime(clampedTime);
			setEndTimeInput(formatTimestamp(clampedTime));
		},
		[endTime, startTime, videoDuration],
	);

	// YouTube Player handlers
	const handlePlayerReady = useCallback((player: YTPlayer) => {
		youtubePlayerRef.current = player;
	}, []);

	const handleTimeUpdate = useCallback((time: number) => {
		// 数値チェックとデバウンス
		if (typeof time === "number" && !Number.isNaN(time) && Number.isFinite(time)) {
			const roundedTime = Math.round(time * 10) / 10;
			// 前回と同じ値なら更新をスキップ（0.1秒精度）
			if (Math.abs(lastTimeRef.current - roundedTime) >= 0.1) {
				lastTimeRef.current = roundedTime;
				setCurrentTime(roundedTime);
			}
		} else {
		}
	}, []);

	// 時間設定のシンプル化
	const setCurrentAsStart = useCallback(() => {
		// YouTubeプレイヤーから直接時間を取得を試行
		let time = Math.round(currentTime * 10) / 10;

		if (youtubePlayerRef.current) {
			try {
				const playerTime = youtubePlayerRef.current.getCurrentTime();
				if (
					typeof playerTime === "number" &&
					!Number.isNaN(playerTime) &&
					Number.isFinite(playerTime)
				) {
					time = Math.round(playerTime * 10) / 10;
				}
			} catch (_error) {}
		}
		setStartTime(time);
		setStartTimeInput(formatTimestamp(time));
		if (endTime <= time) {
			const newEndTime = Math.round(Math.min(time + 5, videoDuration) * 10) / 10;
			setEndTime(newEndTime);
			setEndTimeInput(formatTimestamp(newEndTime));
		}
	}, [currentTime, endTime, videoDuration]);

	const setCurrentAsEnd = useCallback(() => {
		// YouTubeプレイヤーから直接時間を取得を試行
		let time = Math.round(currentTime * 10) / 10;

		if (youtubePlayerRef.current) {
			try {
				const playerTime = youtubePlayerRef.current.getCurrentTime();
				if (
					typeof playerTime === "number" &&
					!Number.isNaN(playerTime) &&
					Number.isFinite(playerTime)
				) {
					time = Math.round(playerTime * 10) / 10;
				}
			} catch (_error) {}
		}

		if (time > startTime) {
			const newEndTime = Math.round(Math.min(time, startTime + 60) * 10) / 10;
			setEndTime(newEndTime);
			setEndTimeInput(formatTimestamp(newEndTime));
		}
	}, [currentTime, startTime]);

	// プレビュー再生
	const previewRange = useCallback(() => {
		if (youtubePlayerRef.current) {
			youtubePlayerRef.current.seekTo(startTime);
			youtubePlayerRef.current.playVideo();

			setTimeout(
				() => {
					if (youtubePlayerRef.current) {
						youtubePlayerRef.current.pauseVideo();
					}
				},
				(endTime - startTime) * 1000,
			);
		}
	}, [startTime, endTime]);

	// タグ追加処理
	const addTag = useCallback(() => {
		const trimmedTag = tagInput.trim();
		if (
			trimmedTag &&
			Array.isArray(tags) &&
			!tags.includes(trimmedTag) &&
			tags.length < 15 &&
			trimmedTag.length <= 30
		) {
			setTags([...tags, trimmedTag]);
			setTagInput("");
		}
	}, [tagInput, tags]);

	// タグ削除処理
	const removeTag = useCallback(
		(tagToRemove: string) => {
			if (Array.isArray(tags)) {
				setTags(tags.filter((tag) => tag !== tagToRemove));
			}
		},
		[tags],
	);

	// エンターキーでタグ追加
	const handleTagInputKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === "Enter") {
				e.preventDefault();
				addTag();
			}
		},
		[addTag],
	);

	// バリデーション
	const duration = Math.round((endTime - startTime) * 10) / 10;
	const isValid = title.trim().length > 0 && duration >= 1 && duration <= 60;

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
				startTime,
				endTime,
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
	}, [isValid, videoId, title, description, tags, startTime, endTime, router]);

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

							{/* 使用方法説明 */}
							<div className="mt-4 p-3 bg-muted/50 rounded-lg">
								<ul className="text-xs sm:text-sm text-muted-foreground space-y-1">
									<li className="flex items-start gap-2">
										<span className="text-primary">•</span>
										<span>動画を見ながら範囲を決めてください</span>
									</li>
									<li className="flex items-start gap-2">
										<span className="text-primary">•</span>
										<span>最大60秒まで切り抜き可能です</span>
									</li>
								</ul>
							</div>
						</div>

						{/* 右側: 操作パネル */}
						<div className="lg:col-span-1 xl:col-span-1 space-y-4">
							{/* 音声操作カード */}
							<div className="bg-card border rounded-lg p-4 lg:p-6 shadow-sm h-fit lg:sticky lg:top-6">
								<h3 className="text-lg font-semibold mb-4">音声操作</h3>
								<div className="space-y-4 lg:space-y-6">
									{/* 現在時間表示 */}
									<div className="p-3 lg:p-4 bg-primary/10 border border-primary/20 rounded-lg">
										<div className="flex items-center justify-between">
											<div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
												<Clock className="h-4 w-4" />
												<span className="hidden sm:inline">動画再生時間</span>
												<span className="sm:hidden">再生時間</span>
											</div>
											<div className="text-base sm:text-lg font-mono font-semibold text-primary">
												{formatTimestamp(currentTime)}
											</div>
										</div>
									</div>

									{/* 範囲選択 */}
									<div className="space-y-4">
										<div className="text-sm sm:text-base font-medium">
											<span>切り抜き範囲</span>
										</div>

										{/* 時間設定ボタン: モバイル対応 */}
										<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
											{/* 開始時間設定 */}
											<div className="relative border rounded-lg overflow-hidden">
												{/* 上半分: クリックボタン */}
												<Button
													variant="ghost"
													onClick={setCurrentAsStart}
													disabled={isCreating}
													className="w-full h-8 sm:h-10 rounded-none border-b hover:bg-primary/10 hover:text-primary transition-colors"
												>
													<MousePointer className="h-3 w-3 mr-1" />
													<div className="font-medium text-sm sm:text-base">開始時間に設定</div>
												</Button>
												{/* 中央: テキスト入力 */}
												<div className="p-2 sm:p-3 bg-muted/20 border-b">
													<Input
														type="text"
														value={isEditingStartTime ? startTimeInput : formatTimestamp(startTime)}
														onChange={(e) => {
															const value = e.target.value;
															setStartTimeInput(value);
															setIsEditingStartTime(true);
														}}
														onBlur={() => {
															// フォーカスを失ったときに値を確定
															const timeInSeconds = parseTimeString(startTimeInput);
															if (timeInSeconds !== null) {
																setStartTime(Math.round(timeInSeconds * 10) / 10);
																if (endTime <= timeInSeconds) {
																	const newEndTime =
																		Math.round(Math.min(timeInSeconds + 5, videoDuration) * 10) /
																		10;
																	setEndTime(newEndTime);
																	setEndTimeInput(formatTimestamp(newEndTime));
																}
																setStartTimeInput(
																	formatTimestamp(Math.round(timeInSeconds * 10) / 10),
																);
															} else {
																// 無効な値の場合は元に戻す
																setStartTimeInput(formatTimestamp(startTime));
															}
															setIsEditingStartTime(false);
														}}
														onKeyDown={(e) => {
															if (e.key === "Enter") {
																e.currentTarget.blur();
															}
														}}
														disabled={isCreating}
														className="text-center text-base sm:text-lg font-mono font-semibold text-primary h-8 border-0 bg-transparent focus:bg-background"
														placeholder="0:00.0"
													/>
												</div>
												{/* 下半分: 微調整ボタン */}
												<div className="p-1 bg-muted/10">
													<div className="flex">
														<Button
															variant="ghost"
															size="sm"
															onClick={() => adjustStartTime(-10)}
															disabled={isCreating}
															className="flex-1 h-6 px-0.5 text-[10px] hover:bg-primary/10 hover:text-primary rounded-none border-r border-slate-200 transition-colors"
														>
															-10
														</Button>
														<Button
															variant="ghost"
															size="sm"
															onClick={() => adjustStartTime(-1)}
															disabled={isCreating}
															className="flex-1 h-6 px-0.5 text-[10px] hover:bg-primary/10 hover:text-primary rounded-none border-r border-slate-200 transition-colors"
														>
															-1
														</Button>
														<Button
															variant="ghost"
															size="sm"
															onClick={() => adjustStartTime(-0.1)}
															disabled={isCreating}
															className="flex-1 h-6 px-0.5 text-[10px] hover:bg-primary/10 hover:text-primary rounded-none border-r border-slate-200 transition-colors"
														>
															-0.1
														</Button>
														<Button
															variant="ghost"
															size="sm"
															onClick={() => adjustStartTime(0.1)}
															disabled={isCreating}
															className="flex-1 h-6 px-0.5 text-[10px] hover:bg-primary/10 hover:text-primary rounded-none border-r border-slate-200 transition-colors"
														>
															+0.1
														</Button>
														<Button
															variant="ghost"
															size="sm"
															onClick={() => adjustStartTime(1)}
															disabled={isCreating}
															className="flex-1 h-6 px-0.5 text-[10px] hover:bg-primary/10 hover:text-primary rounded-none border-r border-slate-200 transition-colors"
														>
															+1
														</Button>
														<Button
															variant="ghost"
															size="sm"
															onClick={() => adjustStartTime(10)}
															disabled={isCreating}
															className="flex-1 h-6 px-0.5 text-[10px] hover:bg-primary/10 hover:text-primary rounded-none transition-colors"
														>
															+10
														</Button>
													</div>
												</div>
											</div>

											{/* 終了時間設定 */}
											<div className="relative border rounded-lg overflow-hidden">
												{/* 上半分: クリックボタン */}
												<Button
													variant="ghost"
													onClick={setCurrentAsEnd}
													disabled={isCreating || currentTime <= startTime}
													className="w-full h-8 sm:h-10 rounded-none border-b hover:bg-primary/10 hover:text-primary transition-colors"
												>
													<MousePointer className="h-3 w-3 mr-1" />
													<div className="font-medium text-sm sm:text-base">終了時間に設定</div>
												</Button>
												{/* 中央: テキスト入力 */}
												<div className="p-2 sm:p-3 bg-muted/20 border-b">
													<Input
														type="text"
														value={isEditingEndTime ? endTimeInput : formatTimestamp(endTime)}
														onChange={(e) => {
															const value = e.target.value;
															setEndTimeInput(value);
															setIsEditingEndTime(true);
														}}
														onBlur={() => {
															// フォーカスを失ったときに値を確定
															const timeInSeconds = parseTimeString(endTimeInput);
															if (timeInSeconds !== null && timeInSeconds > startTime) {
																const newEndTime =
																	Math.round(Math.min(timeInSeconds, startTime + 60) * 10) / 10;
																setEndTime(newEndTime);
																setEndTimeInput(formatTimestamp(newEndTime));
															} else {
																// 無効な値の場合は元に戻す
																setEndTimeInput(formatTimestamp(endTime));
															}
															setIsEditingEndTime(false);
														}}
														onKeyDown={(e) => {
															if (e.key === "Enter") {
																e.currentTarget.blur();
															}
														}}
														disabled={isCreating}
														className="text-center text-base sm:text-lg font-mono font-semibold text-primary h-8 border-0 bg-transparent focus:bg-background"
														placeholder="0:00.0"
													/>
												</div>
												{/* 下半分: 微調整ボタン */}
												<div className="p-1 bg-muted/10">
													<div className="flex">
														<Button
															variant="ghost"
															size="sm"
															onClick={() => adjustEndTime(-10)}
															disabled={isCreating}
															className="flex-1 h-6 px-0.5 text-[10px] hover:bg-primary/10 hover:text-primary rounded-none border-r border-slate-200 transition-colors"
														>
															-10
														</Button>
														<Button
															variant="ghost"
															size="sm"
															onClick={() => adjustEndTime(-1)}
															disabled={isCreating}
															className="flex-1 h-6 px-0.5 text-[10px] hover:bg-primary/10 hover:text-primary rounded-none border-r border-slate-200 transition-colors"
														>
															-1
														</Button>
														<Button
															variant="ghost"
															size="sm"
															onClick={() => adjustEndTime(-0.1)}
															disabled={isCreating}
															className="flex-1 h-6 px-0.5 text-[10px] hover:bg-primary/10 hover:text-primary rounded-none border-r border-slate-200 transition-colors"
														>
															-0.1
														</Button>
														<Button
															variant="ghost"
															size="sm"
															onClick={() => adjustEndTime(0.1)}
															disabled={isCreating}
															className="flex-1 h-6 px-0.5 text-[10px] hover:bg-primary/10 hover:text-primary rounded-none border-r border-slate-200 transition-colors"
														>
															+0.1
														</Button>
														<Button
															variant="ghost"
															size="sm"
															onClick={() => adjustEndTime(1)}
															disabled={isCreating}
															className="flex-1 h-6 px-0.5 text-[10px] hover:bg-primary/10 hover:text-primary rounded-none border-r border-slate-200 transition-colors"
														>
															+1
														</Button>
														<Button
															variant="ghost"
															size="sm"
															onClick={() => adjustEndTime(10)}
															disabled={isCreating}
															className="flex-1 h-6 px-0.5 text-[10px] hover:bg-primary/10 hover:text-primary rounded-none transition-colors"
														>
															+10
														</Button>
													</div>
												</div>
											</div>
										</div>

										{/* 長さ表示: モバイル対応 */}
										<div
											className={`p-3 sm:p-4 rounded-lg text-center ${
												duration > 60
													? "bg-destructive/10 border border-destructive/20"
													: "bg-primary/10 border border-primary/20"
											}`}
										>
											<p className="text-sm sm:text-base">
												<span className="text-muted-foreground">切り抜き時間: </span>
												<strong className={duration > 60 ? "text-destructive" : "text-primary"}>
													{duration.toFixed(1)}秒
												</strong>
											</p>
											{duration > 60 && (
												<p className="text-xs sm:text-sm text-destructive mt-1">
													60秒以下にしてください
												</p>
											)}
										</div>

										{/* プレビューボタン: モバイル対応 */}
										<Button
											variant="secondary"
											onClick={previewRange}
											disabled={isCreating || duration <= 0}
											className="w-full min-h-[44px] h-11 sm:h-12 font-medium text-sm sm:text-base"
											size="lg"
										>
											<Play className="h-4 w-4 mr-2" />
											選択範囲をプレビュー
										</Button>
									</div>
								</div>
							</div>

							{/* 基本情報カード */}
							<div className="bg-card border rounded-lg p-4 lg:p-6 shadow-sm">
								<h3 className="text-lg font-semibold mb-4">基本情報</h3>
								<div className="space-y-4">
									{/* タイトル入力 */}
									<div className="space-y-2">
										<label htmlFor={titleId} className="text-sm sm:text-base font-medium">
											ボタンタイトル <span className="text-destructive">*</span>
										</label>
										<Input
											id={titleId}
											value={title}
											onChange={(e) => setTitle(e.target.value)}
											placeholder="例: おはようございます"
											maxLength={100}
											disabled={isCreating}
											className="text-base min-h-[44px]"
										/>
										<p className="text-xs sm:text-sm text-muted-foreground">{title.length}/100</p>
									</div>

									{/* 説明文入力 */}
									<div className="space-y-2">
										<label htmlFor="description-input" className="text-sm sm:text-base font-medium">
											説明（任意）
										</label>
										<Textarea
											id="description-input"
											value={description}
											onChange={(e) => setDescription(e.target.value)}
											placeholder="音声ボタンの詳細説明を入力（任意）"
											maxLength={500}
											disabled={isCreating}
											rows={3}
											className="text-base resize-none"
										/>
										<p className="text-xs sm:text-sm text-muted-foreground">
											{description.length}/500
										</p>
									</div>

									{/* タグ入力 */}
									<div className="space-y-2">
										<label
											htmlFor="tag-input"
											className="text-sm sm:text-base font-medium flex items-center gap-2"
										>
											<Tag className="h-4 w-4" />
											タグ（任意）
										</label>
										<div className="flex gap-2">
											<Input
												id="tag-input"
												value={tagInput}
												onChange={(e) => setTagInput(e.target.value)}
												onKeyDown={handleTagInputKeyDown}
												placeholder="タグを入力してEnter"
												maxLength={30}
												disabled={isCreating || tags.length >= 15}
												className="text-base flex-1"
											/>
											<Button
												type="button"
												variant="outline"
												size="sm"
												onClick={addTag}
												disabled={
													!tagInput.trim() ||
													tags.includes(tagInput.trim()) ||
													tags.length >= 15 ||
													isCreating
												}
												className="shrink-0"
											>
												<Plus className="h-4 w-4" />
											</Button>
										</div>

										{/* タグ表示 */}
										{tags.length > 0 && (
											<div className="flex flex-wrap gap-2">
												{tags.map((tag) => (
													<Badge
														key={tag}
														variant="secondary"
														className="flex items-center gap-1 px-2 py-1"
													>
														{tag}
														<button
															type="button"
															onClick={() => removeTag(tag)}
															disabled={isCreating}
															className="hover:bg-muted-foreground/20 rounded-full p-0.5 ml-1"
														>
															<X className="h-3 w-3" />
														</button>
													</Badge>
												))}
											</div>
										)}

										<p className="text-xs sm:text-sm text-muted-foreground">
											{tags.length}/15個のタグ（各タグ最大30文字）
										</p>
									</div>
								</div>
							</div>
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
