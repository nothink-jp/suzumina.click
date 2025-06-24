"use client";

import {
	type AudioReferenceCategory,
	type CreateAudioReferenceInput,
	formatTimeRange,
	formatTimestamp,
	SUGGESTED_AUDIO_REFERENCE_TAGS,
} from "@suzumina.click/shared-types/src/audio-reference";
import { Badge } from "@suzumina.click/ui/components/ui/badge";
import { Button } from "@suzumina.click/ui/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@suzumina.click/ui/components/ui/card";
import { Input } from "@suzumina.click/ui/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@suzumina.click/ui/components/ui/select";
import { Slider } from "@suzumina.click/ui/components/ui/slider";
import { Textarea } from "@suzumina.click/ui/components/ui/textarea";
import { Clock, Loader2, Play, Plus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createAudioReference } from "@/app/buttons/actions";
import { AudioReferenceCard } from "./AudioReferenceCard";
import { YouTubePlayer, type YTPlayer } from "./YouTubePlayer";

interface AudioReferenceCreatorProps {
	videoId: string;
	videoTitle: string;
	videoDuration?: number;
	initialStartTime?: number;
	onCancel?: () => void;
	onSuccess?: (audioReferenceId: string) => void;
}

interface TagInputProps {
	tags: string[];
	onChange: (tags: string[]) => void;
	placeholder?: string;
	maxTags?: number;
	suggestions?: readonly string[];
}

function TagInput({
	tags,
	onChange,
	placeholder = "タグを入力...",
	maxTags = 10,
	suggestions = [],
}: TagInputProps) {
	const [inputValue, setInputValue] = useState("");
	const [showSuggestions, setShowSuggestions] = useState(false);

	const addTag = useCallback(
		(tag: string) => {
			const trimmedTag = tag.trim();
			if (trimmedTag && !tags.includes(trimmedTag) && tags.length < maxTags) {
				onChange([...tags, trimmedTag]);
			}
			setInputValue("");
			setShowSuggestions(false);
		},
		[tags, onChange, maxTags],
	);

	const removeTag = useCallback(
		(index: number) => {
			onChange(tags.filter((_, i) => i !== index));
		},
		[tags, onChange],
	);

	const handleInputKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === "Enter" || e.key === ",") {
				e.preventDefault();
				addTag(inputValue);
			}
		},
		[inputValue, addTag],
	);

	const filteredSuggestions = suggestions
		.filter(
			(suggestion) =>
				!tags.includes(suggestion) && suggestion.toLowerCase().includes(inputValue.toLowerCase()),
		)
		.slice(0, 8);

	return (
		<div className="space-y-3">
			<div className="flex flex-wrap gap-2">
				{tags.map((tag, index) => (
					<Badge key={tag} variant="secondary" className="flex items-center gap-1">
						{tag}
						<button
							type="button"
							onClick={() => removeTag(index)}
							className="ml-1 hover:text-destructive"
							aria-label={`${tag}タグを削除`}
						>
							<X className="h-3 w-3" />
						</button>
					</Badge>
				))}
			</div>

			<div className="relative">
				<Input
					value={inputValue}
					onChange={(e) => {
						setInputValue(e.target.value);
						setShowSuggestions(e.target.value.length > 0);
					}}
					onKeyDown={handleInputKeyDown}
					onFocus={() => setShowSuggestions(inputValue.length > 0)}
					onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
					placeholder={tags.length >= maxTags ? `最大${maxTags}個まで` : placeholder}
					disabled={tags.length >= maxTags}
				/>

				{showSuggestions && filteredSuggestions.length > 0 && (
					<div className="absolute z-10 w-full mt-1 bg-popover border rounded-md shadow-lg">
						<div className="p-2 space-y-1">
							{filteredSuggestions.map((suggestion) => (
								<button
									key={suggestion}
									type="button"
									onClick={() => addTag(suggestion)}
									className="w-full text-left px-2 py-1 text-sm hover:bg-accent rounded"
								>
									{suggestion}
								</button>
							))}
						</div>
					</div>
				)}
			</div>

			<div className="text-xs text-muted-foreground">
				{tags.length}/{maxTags}個のタグ
			</div>
		</div>
	);
}

export function AudioReferenceCreator({
	videoId,
	videoTitle,
	videoDuration = 600, // デフォルト10分
	initialStartTime = 0,
	onCancel,
	onSuccess,
}: AudioReferenceCreatorProps) {
	const router = useRouter();

	// Form state
	const [startTime, setStartTime] = useState(initialStartTime);
	const [endTime, setEndTime] = useState(Math.min(initialStartTime + 5, videoDuration));
	const [title, setTitle] = useState("");
	const [category, setCategory] = useState<AudioReferenceCategory>("voice");
	const [tags, setTags] = useState<string[]>([]);
	const [description, setDescription] = useState("");
	const [isPublic, _setIsPublic] = useState(true);

	// UI state
	const [isCreating, setIsCreating] = useState(false);
	const [error, setError] = useState("");
	const [currentTime, setCurrentTime] = useState(initialStartTime);

	const youtubePlayerRef = useRef<YTPlayer | null>(null);

	// Unique IDs for form elements
	const titleInputId = useId();
	const descriptionInputId = useId();

	// Computed values
	const duration = endTime - startTime;
	const isValid = title.trim().length > 0 && duration >= 1 && duration <= 60;

	// YouTube Player handlers
	const handlePlayerReady = useCallback((player: YTPlayer) => {
		youtubePlayerRef.current = player;
	}, []);

	const handleTimeUpdate = useCallback((time: number) => {
		setCurrentTime(time);
	}, []);

	// Time range handlers
	const setCurrentTimeAsStart = useCallback(() => {
		if (youtubePlayerRef.current) {
			const time = Math.floor(currentTime);
			setStartTime(time);
			setEndTime(Math.min(time + 5, videoDuration));
		}
	}, [currentTime, videoDuration]);

	const setCurrentTimeAsEnd = useCallback(() => {
		if (youtubePlayerRef.current) {
			const time = Math.floor(currentTime);
			if (time > startTime) {
				setEndTime(Math.min(time, startTime + 60));
			}
		}
	}, [currentTime, startTime]);

	const previewRange = useCallback(() => {
		if (youtubePlayerRef.current) {
			youtubePlayerRef.current.seekTo(startTime);
			youtubePlayerRef.current.playVideo();

			// 終了時間で停止
			setTimeout(() => {
				if (youtubePlayerRef.current) {
					youtubePlayerRef.current.pauseVideo();
				}
			}, duration * 1000);
		}
	}, [startTime, duration]);

	// Form submission
	const handleSubmit = useCallback(async () => {
		if (!isValid) {
			return;
		}

		setIsCreating(true);
		setError("");

		try {
			const input: CreateAudioReferenceInput = {
				videoId,
				title: title.trim(),
				description: description.trim() || undefined,
				category,
				tags: tags.length > 0 ? tags : undefined,
				startTime,
				endTime,
				isPublic,
			};

			const result = await createAudioReference(input);

			if (result.success) {
				onSuccess?.(result.data.id);
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
		category,
		tags,
		startTime,
		endTime,
		isPublic,
		onSuccess,
		router,
	]);

	// Update endTime when startTime changes
	useEffect(() => {
		if (endTime <= startTime) {
			setEndTime(Math.min(startTime + 5, videoDuration));
		}
	}, [startTime, endTime, videoDuration]);

	return (
		<div className="max-w-4xl mx-auto space-y-6 p-4">
			{/* Header */}
			<div className="space-y-2">
				<h1 className="text-2xl sm:text-3xl font-bold text-foreground">音声ボタンを作成</h1>
				<p className="text-muted-foreground">動画「{videoTitle}」から音声ボタンを作成します</p>
			</div>

			{/* Error display */}
			{error && (
				<div className="p-4 border border-destructive/20 bg-destructive/10 rounded-lg">
					<p className="text-sm text-destructive">{error}</p>
				</div>
			)}

			{/* YouTube Player */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Play className="h-5 w-5" />
						対象動画
					</CardTitle>
					<CardDescription>
						音声ボタンを作成する動画です。再生位置を調整して、切り抜きたい部分を指定してください。
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="aspect-video bg-muted rounded-lg overflow-hidden">
						<YouTubePlayer
							videoId={videoId}
							onReady={handlePlayerReady}
							onTimeUpdate={handleTimeUpdate}
							startTime={initialStartTime}
							controls={true}
						/>
					</div>
				</CardContent>
			</Card>

			{/* Timestamp Selection */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Clock className="h-5 w-5" />
						タイムスタンプ選択
					</CardTitle>
					<CardDescription>
						音声ボタンにしたい部分の開始・終了時間を指定してください（最大60秒）
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					{/* Current time display */}
					<div className="p-3 bg-muted/50 rounded-lg">
						<p className="text-sm text-muted-foreground">
							現在の再生時間:{" "}
							<span className="font-mono font-medium text-foreground">
								{formatTimestamp(currentTime)}
							</span>
						</p>
					</div>

					{/* Start time */}
					<div className="space-y-3">
						<div className="flex items-center justify-between">
							<span className="text-sm font-medium">開始時間: {formatTimestamp(startTime)}</span>
							<Button
								variant="outline"
								size="sm"
								onClick={setCurrentTimeAsStart}
								disabled={isCreating}
							>
								現在時間を設定
							</Button>
						</div>
						<Slider
							value={[startTime]}
							onValueChange={([value]) => setStartTime(value ?? 0)}
							max={videoDuration}
							step={1}
							className="w-full"
							disabled={isCreating}
						/>
					</div>

					{/* End time */}
					<div className="space-y-3">
						<div className="flex items-center justify-between">
							<span className="text-sm font-medium">終了時間: {formatTimestamp(endTime)}</span>
							<Button
								variant="outline"
								size="sm"
								onClick={setCurrentTimeAsEnd}
								disabled={isCreating || currentTime <= startTime}
							>
								現在時間を設定
							</Button>
						</div>
						<Slider
							value={[endTime]}
							onValueChange={([value]) => setEndTime(value ?? 0)}
							min={startTime + 1}
							max={Math.min(startTime + 60, videoDuration)}
							step={1}
							className="w-full"
							disabled={isCreating}
						/>
					</div>

					{/* Duration info */}
					<div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
						<div className="space-y-1">
							<p className="text-sm font-medium">選択範囲: {formatTimeRange(startTime, endTime)}</p>
							<p className="text-xs text-muted-foreground">
								長さ: {duration}秒 {duration > 60 && "（60秒以下にしてください）"}
							</p>
						</div>
						<Button
							variant="outline"
							onClick={previewRange}
							disabled={isCreating || duration <= 0}
							className="flex-shrink-0"
						>
							<Play className="h-4 w-4 mr-2" />
							プレビュー
						</Button>
					</div>
				</CardContent>
			</Card>

			{/* Metadata Input */}
			<Card>
				<CardHeader>
					<CardTitle>音声ボタン情報</CardTitle>
					<CardDescription>作成する音声ボタンの詳細情報を入力してください</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					{/* Title */}
					<div className="space-y-2">
						<label htmlFor={titleInputId} className="text-sm font-medium">
							タイトル <span className="text-destructive">*</span>
						</label>
						<Input
							id={titleInputId}
							value={title}
							onChange={(e) => setTitle(e.target.value)}
							placeholder="例: おはようございます"
							maxLength={100}
							disabled={isCreating}
						/>
						<p className="text-xs text-muted-foreground">{title.length}/100文字</p>
					</div>

					{/* Category */}
					<div className="space-y-2">
						<label htmlFor="category-select" className="text-sm font-medium">
							カテゴリ
						</label>
						<Select
							value={category}
							onValueChange={(value: AudioReferenceCategory) => setCategory(value)}
							disabled={isCreating}
						>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="voice">ボイス</SelectItem>
								<SelectItem value="bgm">BGM・音楽</SelectItem>
								<SelectItem value="se">効果音</SelectItem>
								<SelectItem value="talk">トーク・会話</SelectItem>
								<SelectItem value="singing">歌唱</SelectItem>
								<SelectItem value="other">その他</SelectItem>
							</SelectContent>
						</Select>
					</div>

					{/* Tags */}
					<div className="space-y-2">
						<label htmlFor="tags-input" className="text-sm font-medium">
							タグ（任意）
						</label>
						<TagInput
							tags={tags}
							onChange={setTags}
							placeholder="タグを入力してEnterキー"
							maxTags={10}
							suggestions={SUGGESTED_AUDIO_REFERENCE_TAGS}
						/>
					</div>

					{/* Description */}
					<div className="space-y-2">
						<label htmlFor={descriptionInputId} className="text-sm font-medium">
							説明（任意）
						</label>
						<Textarea
							id={descriptionInputId}
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							placeholder="この音声ボタンの説明..."
							maxLength={500}
							rows={3}
							disabled={isCreating}
						/>
						<p className="text-xs text-muted-foreground">{description.length}/500文字</p>
					</div>
				</CardContent>
			</Card>

			{/* Preview */}
			<Card>
				<CardHeader>
					<CardTitle>プレビュー</CardTitle>
					<CardDescription>作成される音声ボタンのプレビューです</CardDescription>
				</CardHeader>
				<CardContent>
					<AudioReferenceCard
						audioReference={{
							id: "preview",
							title: title || "(タイトルなし)",
							description,
							category,
							tags,
							videoId,
							videoTitle,
							startTime,
							endTime,
							duration,
							playCount: 0,
							likeCount: 0,
							viewCount: 0,
							createdBy: "preview-user",
							createdByName: "プレビュー",
							createdAt: new Date().toISOString(),
							updatedAt: new Date().toISOString(),
							createdAtISO: new Date().toISOString(),
							updatedAtISO: new Date().toISOString(),
							durationText: `${duration}秒`,
							timestampText: formatTimeRange(startTime, endTime),
							youtubeUrl: `https://www.youtube.com/watch?v=${videoId}&t=${startTime}s`,
							youtubeEmbedUrl: `https://www.youtube.com/embed/${videoId}?start=${startTime}&end=${endTime}`,
						}}
						variant="compact"
						isPreview={true}
					/>
				</CardContent>
			</Card>

			{/* Action buttons */}
			<div className="flex flex-col sm:flex-row gap-3 pt-4">
				<Button
					variant="outline"
					onClick={onCancel || (() => router.back())}
					disabled={isCreating}
					className="flex-1 sm:flex-none"
				>
					キャンセル
				</Button>
				<Button
					onClick={handleSubmit}
					disabled={!isValid || isCreating}
					className="flex-1 min-w-[200px]"
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
	);
}
