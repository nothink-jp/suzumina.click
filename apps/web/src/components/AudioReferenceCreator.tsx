"use client";

import {
	type CreateAudioReferenceInput,
	formatTimestamp,
} from "@suzumina.click/shared-types/src/audio-reference";
import { Button } from "@suzumina.click/ui/components/ui/button";
import { Input } from "@suzumina.click/ui/components/ui/input";
import { Clock, Loader2, Play, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useId, useRef, useState } from "react";
import { createAudioReference } from "@/app/buttons/actions";
import { YouTubePlayer, type YTPlayer } from "./YouTubePlayer";

interface AudioReferenceCreatorProps {
	videoId: string;
	videoTitle: string;
	videoDuration?: number;
	initialStartTime?: number;
}

export function AudioReferenceCreator({
	videoId,
	videoTitle,
	videoDuration = 600,
	initialStartTime = 0,
}: AudioReferenceCreatorProps) {
	const router = useRouter();
	const titleId = useId();

	// 必須の状態のみ
	const [title, setTitle] = useState("");
	const [startTime, setStartTime] = useState(initialStartTime);
	const [endTime, setEndTime] = useState(Math.min(initialStartTime + 5, videoDuration));
	const [currentTime, setCurrentTime] = useState(initialStartTime);
	const [isCreating, setIsCreating] = useState(false);
	const [error, setError] = useState("");

	const youtubePlayerRef = useRef<YTPlayer | null>(null);
	const lastTimeRef = useRef<number>(initialStartTime);

	// YouTube Player handlers
	const handlePlayerReady = useCallback((player: YTPlayer) => {
		youtubePlayerRef.current = player;
	}, []);

	const handleTimeUpdate = useCallback((time: number) => {
		// 数値チェックとデバウンス
		if (typeof time === "number" && !Number.isNaN(time) && Number.isFinite(time)) {
			const roundedTime = Math.floor(time);
			// 前回と同じ値なら更新をスキップ
			if (lastTimeRef.current !== roundedTime) {
				lastTimeRef.current = roundedTime;
				setCurrentTime(roundedTime);
				// biome-ignore lint/suspicious/noConsole: Debug logging for time updates
				console.log("Time updated:", roundedTime);
			}
		} else {
			// biome-ignore lint/suspicious/noConsole: Debug logging for invalid time values
			console.warn("Invalid time value received:", time, typeof time);
		}
	}, []);

	// 時間設定のシンプル化
	const setCurrentAsStart = useCallback(() => {
		// YouTubeプレイヤーから直接時間を取得を試行
		let time = Math.floor(currentTime);

		if (youtubePlayerRef.current) {
			try {
				const playerTime = youtubePlayerRef.current.getCurrentTime();
				if (
					typeof playerTime === "number" &&
					!Number.isNaN(playerTime) &&
					Number.isFinite(playerTime)
				) {
					time = Math.floor(playerTime);
					// biome-ignore lint/suspicious/noConsole: Debug logging for player time
					console.log("開始時間設定:", time, "秒");
				}
			} catch (error) {
				// biome-ignore lint/suspicious/noConsole: Debug logging for player errors
				console.warn("プレイヤー時間取得エラー:", error);
			}
		}

		setStartTime(time);
		if (endTime <= time) {
			setEndTime(Math.min(time + 5, videoDuration));
		}
	}, [currentTime, endTime, videoDuration]);

	const setCurrentAsEnd = useCallback(() => {
		// YouTubeプレイヤーから直接時間を取得を試行
		let time = Math.floor(currentTime);

		if (youtubePlayerRef.current) {
			try {
				const playerTime = youtubePlayerRef.current.getCurrentTime();
				if (
					typeof playerTime === "number" &&
					!Number.isNaN(playerTime) &&
					Number.isFinite(playerTime)
				) {
					time = Math.floor(playerTime);
				}
			} catch (error) {
				// biome-ignore lint/suspicious/noConsole: Debug logging for player errors
				console.warn("プレイヤー時間取得エラー:", error);
			}
		}

		if (time > startTime) {
			const newEndTime = Math.min(time, startTime + 60);
			// biome-ignore lint/suspicious/noConsole: Debug logging for end time setting
			console.log("終了時間設定:", newEndTime, "秒");
			setEndTime(newEndTime);
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

	// バリデーション
	const duration = endTime - startTime;
	const isValid = title.trim().length > 0 && duration >= 1 && duration <= 60;

	// 作成処理
	const handleCreate = useCallback(async () => {
		if (!isValid) return;

		setIsCreating(true);
		setError("");

		try {
			const input: CreateAudioReferenceInput = {
				videoId,
				title: title.trim(),
				category: "voice", // デフォルト
				startTime,
				endTime,
				isPublic: true,
			};

			const result = await createAudioReference(input);

			if (result.success) {
				router.push(`/buttons/${result.data.id}`);
			} else {
				setError(result.error || "作成に失敗しました");
			}
		} catch {
			setError("予期しないエラーが発生しました");
		} finally {
			setIsCreating(false);
		}
	}, [isValid, videoId, title, startTime, endTime, router]);

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

				{/* メインレイアウト: 動画を大きく、操作パネルを下部に */}
				<div className="max-w-6xl mx-auto space-y-6">
					{/* YouTube動画プレイヤー (16:9で大きく表示) */}
					<div className="relative">
						<div className="aspect-video bg-muted rounded-lg overflow-hidden shadow-lg max-w-5xl mx-auto">
							<YouTubePlayer
								videoId={videoId}
								onReady={handlePlayerReady}
								onTimeUpdate={handleTimeUpdate}
								startTime={initialStartTime}
								controls={true}
							/>
						</div>
					</div>

					{/* 操作パネル: 動画下に横並びレイアウト */}
					<div className="bg-card border rounded-lg p-6 shadow-sm">
						<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
							{/* 左側: タイトル入力と基本操作 */}
							<div className="space-y-4">
								{/* 現在時間表示 */}
								<div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-2 text-sm text-muted-foreground">
											<Clock className="h-4 w-4" />
											動画再生時間
										</div>
										<div className="text-lg font-mono font-semibold text-primary">
											{formatTimestamp(currentTime)}
										</div>
									</div>
								</div>

								{/* タイトル入力 */}
								<div className="space-y-2">
									<label htmlFor={titleId} className="text-sm font-medium">
										ボタンタイトル <span className="text-destructive">*</span>
									</label>
									<Input
										id={titleId}
										value={title}
										onChange={(e) => setTitle(e.target.value)}
										placeholder="例: おはようございます"
										maxLength={100}
										disabled={isCreating}
										className="text-base"
									/>
									<p className="text-xs text-muted-foreground">{title.length}/100</p>
								</div>
							</div>

							{/* 右側: 範囲選択と操作 */}
							<div className="space-y-4">
								{/* 範囲選択 */}
								<div className="space-y-4">
									<div className="text-sm font-medium flex items-center gap-2">
										切り抜き範囲
										<span className="text-xs text-muted-foreground">
											({formatTimestamp(startTime)} - {formatTimestamp(endTime)})
										</span>
									</div>

									{/* 時間設定ボタンを大きく、わかりやすく */}
									<div className="grid grid-cols-2 gap-3">
										<Button
											variant="outline"
											onClick={setCurrentAsStart}
											disabled={isCreating}
											className="h-16 flex flex-col items-center justify-center text-xs"
										>
											<div className="font-medium text-sm">開始時間に設定</div>
											<div className="text-muted-foreground">{formatTimestamp(startTime)}</div>
										</Button>

										<Button
											variant="outline"
											onClick={setCurrentAsEnd}
											disabled={isCreating || currentTime <= startTime}
											className="h-16 flex flex-col items-center justify-center text-xs"
										>
											<div className="font-medium text-sm">終了時間に設定</div>
											<div className="text-muted-foreground">{formatTimestamp(endTime)}</div>
										</Button>
									</div>

									{/* 長さ表示を目立たせる */}
									<div
										className={`p-3 rounded-lg text-center ${
											duration > 60
												? "bg-destructive/10 border border-destructive/20"
												: "bg-primary/10 border border-primary/20"
										}`}
									>
										<p className="text-sm">
											<span className="text-muted-foreground">切り抜き時間: </span>
											<strong className={duration > 60 ? "text-destructive" : "text-primary"}>
												{duration}秒
											</strong>
										</p>
										{duration > 60 && (
											<p className="text-xs text-destructive mt-1">60秒以下にしてください</p>
										)}
									</div>

									{/* プレビューボタンを目立たせる */}
									<Button
										variant="secondary"
										onClick={previewRange}
										disabled={isCreating || duration <= 0}
										className="w-full h-11 font-medium"
										size="lg"
									>
										<Play className="h-4 w-4 mr-2" />
										選択範囲をプレビュー
									</Button>
								</div>
							</div>
						</div>

						{/* 下部: 作成ボタンと説明 */}
						<div className="flex flex-col lg:flex-row gap-4 items-center justify-between mt-6 pt-6 border-t">
							<div className="text-xs text-muted-foreground space-y-1 lg:space-y-0 lg:space-x-4 lg:flex">
								<span>• 動画を見ながら範囲を決めてください</span>
								<span>• 最大60秒まで切り抜き可能です</span>
							</div>

							<div className="flex gap-3 w-full lg:w-auto">
								<Button
									variant="outline"
									onClick={() => router.back()}
									disabled={isCreating}
									className="flex-1 lg:flex-none"
								>
									キャンセル
								</Button>
								<Button
									onClick={handleCreate}
									disabled={!isValid || isCreating}
									className="flex-1 lg:flex-none h-11 px-8"
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
