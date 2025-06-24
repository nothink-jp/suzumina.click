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

	// YouTube Player handlers
	const handlePlayerReady = useCallback((player: YTPlayer) => {
		youtubePlayerRef.current = player;
	}, []);

	const handleTimeUpdate = useCallback((time: number) => {
		setCurrentTime(time);
	}, []);

	// 時間設定のシンプル化
	const setCurrentAsStart = useCallback(() => {
		const time = Math.floor(currentTime);
		setStartTime(time);
		if (endTime <= time) {
			setEndTime(Math.min(time + 5, videoDuration));
		}
	}, [currentTime, endTime, videoDuration]);

	const setCurrentAsEnd = useCallback(() => {
		const time = Math.floor(currentTime);
		if (time > startTime) {
			setEndTime(Math.min(time, startTime + 60));
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

				{/* メインレイアウト: 2ペイン横並び */}
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-h-[600px]">
					{/* 左ペイン: YouTube動画 (大きく) */}
					<div className="lg:col-span-2">
						<div className="sticky top-6">
							<div className="aspect-video bg-muted rounded-lg overflow-hidden">
								<YouTubePlayer
									videoId={videoId}
									onReady={handlePlayerReady}
									onTimeUpdate={handleTimeUpdate}
									startTime={initialStartTime}
									controls={true}
								/>
							</div>
						</div>
					</div>

					{/* 右ペイン: 操作パネル (シンプル) */}
					<div className="lg:col-span-1">
						<div className="sticky top-6 space-y-4">
							{/* 現在時間表示 */}
							<div className="p-3 bg-muted/50 rounded-lg">
								<div className="flex items-center gap-2 text-sm text-muted-foreground">
									<Clock className="h-4 w-4" />
									現在: {formatTimestamp(currentTime)}
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

							{/* 範囲選択 */}
							<div className="space-y-3">
								<div className="text-sm font-medium">切り抜き範囲</div>

								{/* 開始時間 */}
								<div className="flex items-center justify-between">
									<span className="text-sm">開始: {formatTimestamp(startTime)}</span>
									<Button
										variant="outline"
										size="sm"
										onClick={setCurrentAsStart}
										disabled={isCreating}
									>
										現在時間
									</Button>
								</div>

								{/* 終了時間 */}
								<div className="flex items-center justify-between">
									<span className="text-sm">終了: {formatTimestamp(endTime)}</span>
									<Button
										variant="outline"
										size="sm"
										onClick={setCurrentAsEnd}
										disabled={isCreating || currentTime <= startTime}
									>
										現在時間
									</Button>
								</div>

								{/* 長さ表示 */}
								<div className="p-2 bg-muted/50 rounded text-center">
									<p className="text-sm">
										長さ: <strong>{duration}秒</strong>
										{duration > 60 && (
											<span className="text-destructive ml-1">(60秒以下にしてください)</span>
										)}
									</p>
								</div>

								{/* プレビューボタン */}
								<Button
									variant="secondary"
									onClick={previewRange}
									disabled={isCreating || duration <= 0}
									className="w-full"
								>
									<Play className="h-4 w-4 mr-2" />
									プレビュー再生
								</Button>
							</div>

							{/* 作成ボタン */}
							<div className="pt-4 space-y-3">
								<Button
									onClick={handleCreate}
									disabled={!isValid || isCreating}
									className="w-full h-12 text-base"
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

								<Button
									variant="outline"
									onClick={() => router.back()}
									disabled={isCreating}
									className="w-full"
								>
									キャンセル
								</Button>
							</div>

							{/* 簡単な説明 */}
							<div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
								<p>• 動画を見ながら範囲を決めてください</p>
								<p>• 最大60秒まで切り抜き可能です</p>
								<p>• 詳細設定は作成後に編集できます</p>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
