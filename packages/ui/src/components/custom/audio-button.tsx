"use client";

import { cn } from "@suzumina.click/ui/lib/utils";
import { Loader2, Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "../ui/button.js";

interface AudioButtonProps {
	/** 音声ファイルのURL */
	audioUrl: string;
	/** 音声ボタンのタイトル */
	title: string;
	/** 音声の長さ（秒） */
	duration?: number;
	/** 音声ボタンのカテゴリ */
	category?: "voice" | "bgm" | "se" | "talk" | "singing" | "other";
	/** 自動再生するかどうか */
	autoPlay?: boolean;
	/** 無効化するかどうか */
	disabled?: boolean;
	/** カスタムクラス名 */
	className?: string;
	/** サイズ */
	size?: "sm" | "md" | "lg";
	/** 再生開始時のコールバック */
	onPlay?: () => void;
	/** 一時停止時のコールバック */
	onPause?: () => void;
	/** 再生終了時のコールバック */
	onEnded?: () => void;
	/** エラー時のコールバック */
	onError?: (error: string) => void;
	/** 再生回数をカウントするコールバック */
	onPlayCountIncrement?: () => void;
}

/**
 * 音声ボタンコンポーネント
 * 実音声ファイルの再生に特化したシンプルなボタン
 */
export function AudioButton({
	audioUrl,
	title,
	duration,
	category,
	autoPlay = false,
	disabled = false,
	className,
	size = "md",
	onPlay,
	onPause,
	onEnded,
	onError,
	onPlayCountIncrement,
}: AudioButtonProps) {
	const [isPlaying, setIsPlaying] = useState(false);
	const [isLoading, setIsLoading] = useState(true);
	const [hasError, setHasError] = useState(false);
	const audioRef = useRef<HTMLAudioElement>(null);
	const hasPlayedRef = useRef(false);

	// 音声の読み込みとイベントリスナーのセットアップ
	useEffect(() => {
		const audio = audioRef.current;
		if (!audio || !audioUrl) {
			return;
		}

		setIsLoading(true);
		setHasError(false);
		hasPlayedRef.current = false;

		audio.src = audioUrl;
		audio.load();

		const handleLoadedData = () => {
			setIsLoading(false);
			if (autoPlay && !disabled) {
				audio.play().catch(() => {
					setIsPlaying(false);
				});
			}
		};

		const handleError = () => {
			setIsLoading(false);
			setHasError(true);
			onError?.("音声ファイルの読み込みに失敗しました");
		};

		const handlePlay = () => {
			setIsPlaying(true);
			onPlay?.();

			// 初回再生時のみ再生回数をカウント
			if (!hasPlayedRef.current) {
				hasPlayedRef.current = true;
				onPlayCountIncrement?.();
			}
		};

		const handlePause = () => {
			setIsPlaying(false);
			onPause?.();
		};

		const handleEnded = () => {
			setIsPlaying(false);
			onEnded?.();
		};

		audio.addEventListener("loadeddata", handleLoadedData);
		audio.addEventListener("error", handleError);
		audio.addEventListener("play", handlePlay);
		audio.addEventListener("pause", handlePause);
		audio.addEventListener("ended", handleEnded);

		return () => {
			audio.removeEventListener("loadeddata", handleLoadedData);
			audio.removeEventListener("error", handleError);
			audio.removeEventListener("play", handlePlay);
			audio.removeEventListener("pause", handlePause);
			audio.removeEventListener("ended", handleEnded);
		};
	}, [audioUrl, autoPlay, disabled, onPlay, onPause, onEnded, onError, onPlayCountIncrement]);

	// 再生/一時停止の切り替え
	const togglePlayPause = async () => {
		const audio = audioRef.current;
		if (!audio || hasError || disabled) {
			return;
		}

		try {
			if (isPlaying) {
				audio.pause();
			} else {
				await audio.play();
			}
		} catch {
			setIsPlaying(false);
			onError?.("音声の再生に失敗しました");
		}
	};

	// 時間フォーマット
	const formatDuration = (seconds: number): string => {
		const mins = Math.floor(seconds / 60);
		const secs = Math.floor(seconds % 60);
		return `${mins}:${secs.toString().padStart(2, "0")}`;
	};

	// カテゴリに応じたアイコンのスタイル
	const getCategoryColor = () => {
		switch (category) {
			case "voice":
				return "text-pink-600";
			case "bgm":
				return "text-purple-600";
			case "se":
				return "text-yellow-600";
			case "talk":
				return "text-blue-600";
			case "singing":
				return "text-red-600";
			default:
				return "text-gray-600";
		}
	};

	// サイズスタイル
	const getSizeStyles = () => {
		switch (size) {
			case "sm":
				return {
					container: "gap-2 p-2",
					button: "h-8 w-8",
					icon: "h-4 w-4",
					text: "text-sm",
					duration: "text-xs",
				};
			case "lg":
				return {
					container: "gap-4 p-4",
					button: "h-12 w-12",
					icon: "h-6 w-6",
					text: "text-lg",
					duration: "text-sm",
				};
			default:
				return {
					container: "gap-3 p-3",
					button: "h-10 w-10",
					icon: "h-5 w-5",
					text: "text-base",
					duration: "text-sm",
				};
		}
	};

	const sizeStyles = getSizeStyles();

	return (
		<div
			className={cn(
				"flex items-center bg-card border border-border rounded-lg shadow-sm transition-all hover:shadow-md",
				disabled && "opacity-50 cursor-not-allowed",
				hasError && "border-destructive",
				sizeStyles.container,
				className,
			)}
		>
			<audio ref={audioRef} preload="metadata" className="hidden">
				<track kind="captions" />
			</audio>

			{/* 再生/一時停止ボタン */}
			<Button
				variant="default"
				size="sm"
				className={cn(
					sizeStyles.button,
					"bg-primary hover:bg-primary/90 flex-shrink-0",
					getCategoryColor(),
				)}
				onClick={togglePlayPause}
				disabled={isLoading || hasError || disabled}
				aria-label={isPlaying ? "一時停止" : "再生"}
			>
				{isLoading ? (
					<Loader2 className={cn(sizeStyles.icon, "animate-spin")} />
				) : isPlaying ? (
					<Pause className={sizeStyles.icon} />
				) : (
					<Play className={sizeStyles.icon} />
				)}
			</Button>

			{/* タイトルと時間 */}
			<div className="flex-1 min-w-0">
				<div className={cn("font-medium truncate", sizeStyles.text)}>{title}</div>
				{duration && (
					<div className={cn("text-muted-foreground", sizeStyles.duration)}>
						{formatDuration(duration)}
					</div>
				)}
			</div>

			{/* エラー表示 */}
			{hasError && (
				<div className="text-sm text-destructive" role="alert">
					エラー
				</div>
			)}
		</div>
	);
}
