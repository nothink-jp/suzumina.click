import type { AudioButton } from "@suzumina.click/shared-types";
import { Alert, AlertDescription } from "@suzumina.click/ui/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { memo } from "react";
import AudioButtonCard from "./audio-button-card";

interface AudioButtonListProps {
	audioButtons: AudioButton[];
	playCounts?: Record<string, number>;
	favoriteStates?: Record<string, boolean>;
	likeStates?: Record<string, boolean>;
	dislikeStates?: Record<string, boolean>;
	loading?: boolean;
	error?: string | null;
	onPlay?: (audioButtonId: string) => void;
	onFavoriteToggle?: (audioButtonId: string) => void;
	onLikeToggle?: (audioButtonId: string) => void;
	onDislikeToggle?: (audioButtonId: string) => void;
	className?: string;
	showStats?: boolean;
}

/**
 * AudioButton List コンポーネント
 * AudioButton Entity構造に対応したリストコンポーネント
 */
export const AudioButtonList = memo(function AudioButtonList({
	audioButtons,
	playCounts = {},
	favoriteStates = {},
	likeStates = {},
	dislikeStates = {},
	loading = false,
	error = null,
	onPlay,
	onFavoriteToggle,
	onLikeToggle,
	onDislikeToggle,
	className = "",
	showStats = true,
}: AudioButtonListProps) {
	// ローディング状態
	if (loading) {
		return (
			<div className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-3 ${className}`}>
				{Array.from({ length: 6 }, (_, index) => (
					<div
						// biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton loading
						key={`audio-button-skeleton-${index}-of-6`}
						className="h-48 animate-pulse rounded-lg bg-muted"
					/>
				))}
			</div>
		);
	}

	// エラー状態
	if (error) {
		return (
			<Alert variant="destructive" className={className}>
				<AlertCircle className="h-4 w-4" />
				<AlertDescription>{error}</AlertDescription>
			</Alert>
		);
	}

	// 空状態
	if (audioButtons.length === 0) {
		return (
			<div className={`rounded-lg border border-dashed p-8 text-center ${className}`}>
				<p className="text-muted-foreground">音声ボタンが見つかりませんでした</p>
			</div>
		);
	}

	// 音声ボタンリスト
	return (
		<div className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-3 ${className}`}>
			{audioButtons.map((audioButton) => {
				const id = audioButton.id.toString();
				return (
					<AudioButtonCard
						key={id}
						audioButton={audioButton}
						playCount={playCounts[id]}
						isFavorited={favoriteStates[id] || false}
						isLiked={likeStates[id] || false}
						isDisliked={dislikeStates[id] || false}
						onPlay={onPlay ? () => onPlay(id) : undefined}
						onFavoriteToggle={onFavoriteToggle ? () => onFavoriteToggle(id) : undefined}
						onLikeToggle={onLikeToggle ? () => onLikeToggle(id) : undefined}
						onDislikeToggle={onDislikeToggle ? () => onDislikeToggle(id) : undefined}
						showStats={showStats}
					/>
				);
			})}
		</div>
	);
});
