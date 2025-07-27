/**
 * プログレッシブ音声ボタンリスト - Phase 2c レイジーローディング実装
 *
 * 設計特徴:
 * - スケルトン → プレビュー → 完全版の段階的ローディング
 * - 仮想化と組み合わせた最適パフォーマンス
 * - ユーザー操作に応じた動的アップグレード
 * - メモリ使用量の段階的制御
 */

"use client";

import type { AudioButtonPlainObject } from "@suzumina.click/shared-types";
import { memo, useCallback, useMemo, useState } from "react";
import { FixedSizeList as List } from "react-window";
import { cn } from "../../lib/utils";
import { AudioButton } from "./audio-button";
import { AudioButtonPreview, useProgressiveLoading } from "./audio-button-preview";
import { AudioButtonSkeleton } from "./audio-button-skeleton";

export interface ProgressiveAudioButtonListProps {
	/** 表示する音声ボタンデータ */
	audioButtons: AudioButtonPlainObject[];

	/** 再生イベントハンドラー */
	onPlay?: (audioButton: AudioButtonPlainObject, index: number) => void;

	/** 検索クエリ（ハイライト用） */
	searchQuery?: string;

	/** お気に入り状態マップ */
	favoriteStates?: Map<string, boolean>;

	/** お気に入り切り替えハンドラー */
	onFavoriteToggle?: (audioButtonId: string) => void;

	/** 現在再生中の音声ボタンID */
	currentPlayingId?: string;

	/** リストの高さ */
	height?: number;

	/** アイテムの高さ */
	itemSize?: number;

	/** 追加CSSクラス */
	className?: string;

	/** 詳細リンク表示 */
	showDetailLink?: boolean;

	/** 認証状態 */
	isAuthenticated?: boolean;

	/** 空状態メッセージ */
	emptyMessage?: string;

	/** アイテムクリックハンドラー */
	onItemClick?: (audioButton: AudioButtonPlainObject, index: number) => void;

	/** オーバースキャン数 */
	overscanCount?: number;

	/** 初期ローディング状態 */
	isLoading?: boolean;

	/** プレビュー表示範囲 */
	previewBufferSize?: number;

	/** 自動アップグレード有効化 */
	autoUpgrade?: boolean;
}

/**
 * ローディング段階の定義
 */
type LoadingStage = "skeleton" | "preview" | "full";

/**
 * プログレッシブローディングの段階判定
 */
const getLoadingStage = (
	index: number,
	visibleRange: { start: number; end: number },
	upgradedItems: Set<string>,
	audioButtonId: string,
	previewBufferSize: number,
): LoadingStage => {
	// 既にアップグレード済み
	if (upgradedItems.has(audioButtonId)) {
		return "full";
	}

	// 表示領域内はプレビュー
	if (index >= visibleRange.start && index <= visibleRange.end) {
		return "preview";
	}

	// バッファ領域内もプレビュー
	if (
		index >= visibleRange.start - previewBufferSize &&
		index <= visibleRange.end + previewBufferSize
	) {
		return "preview";
	}

	// それ以外はスケルトン
	return "skeleton";
};

/**
 * プログレッシブリストアイテムコンポーネント
 */
const ProgressiveListItem = memo<{
	index: number;
	style: React.CSSProperties;
	data: {
		audioButtons: AudioButtonPlainObject[];
		onPlay?: (audioButton: AudioButtonPlainObject, index: number) => void;
		searchQuery?: string;
		favoriteStates?: Map<string, boolean>;
		onFavoriteToggle?: (audioButtonId: string) => void;
		currentPlayingId?: string;
		onItemClick?: (audioButton: AudioButtonPlainObject, index: number) => void;
		showDetailLink?: boolean;
		isAuthenticated?: boolean;
		visibleRange: { start: number; end: number };
		upgradedItems: Set<string>;
		upgradeItem: (id: string) => void;
		previewBufferSize: number;
		isLoading: boolean;
	};
}>(({ index, style, data }) => {
	const {
		audioButtons,
		onPlay,
		searchQuery,
		favoriteStates,
		onFavoriteToggle,
		currentPlayingId,
		onItemClick,
		showDetailLink,
		isAuthenticated,
		visibleRange,
		upgradedItems,
		upgradeItem,
		previewBufferSize,
		isLoading,
	} = data;

	const audioButton = audioButtons[index];

	// Hooksは early return より前に呼ぶ必要がある
	const loadingStage = useMemo(
		() =>
			audioButton
				? getLoadingStage(index, visibleRange, upgradedItems, audioButton.id, previewBufferSize)
				: "skeleton",
		[audioButton, index, visibleRange, upgradedItems, previewBufferSize],
	);

	const handleUpgrade = useCallback(() => {
		if (audioButton) {
			upgradeItem(audioButton.id);
		}
	}, [upgradeItem, audioButton]);

	const handlePlay = useCallback(() => {
		if (audioButton) {
			// 再生時は自動的にフル版にアップグレード
			upgradeItem(audioButton.id);
			onPlay?.(audioButton, index);
			onItemClick?.(audioButton, index);
		}
	}, [upgradeItem, audioButton, index, onPlay, onItemClick]);

	if (!audioButton) {
		return <div className="h-[140px] bg-muted animate-pulse rounded-lg" />;
	}

	const isCurrentlyPlaying = currentPlayingId === audioButton.id;

	// ローディング中はスケルトンを表示
	if (isLoading && loadingStage === "skeleton") {
		return (
			<div
				style={style}
				className={cn("p-2 transition-colors", isCurrentlyPlaying && "bg-minase-50")}
			>
				<AudioButtonSkeleton />
			</div>
		);
	}

	return (
		<div
			style={style}
			className={cn("p-2 transition-colors", isCurrentlyPlaying && "bg-minase-50")}
		>
			{loadingStage === "skeleton" && (
				<AudioButtonSkeleton
					className={cn(
						"shadow-sm hover:shadow-md transition-all duration-200",
						isCurrentlyPlaying && "ring-2 ring-minase-300",
					)}
				/>
			)}

			{loadingStage === "preview" && (
				<AudioButtonPreview
					audioButton={audioButton}
					searchQuery={searchQuery}
					initialIsFavorited={favoriteStates?.get(audioButton.id) || false}
					onFavoriteToggle={() => onFavoriteToggle?.(audioButton.id)}
					onUpgrade={handleUpgrade}
					showDetailLink={showDetailLink}
					className={cn(
						"shadow-sm hover:shadow-md transition-all duration-200",
						isCurrentlyPlaying && "ring-2 ring-minase-300",
					)}
					highlightClassName="bg-suzuka-200 text-suzuka-900 px-1 rounded"
				/>
			)}

			{loadingStage === "full" && (
				<AudioButton
					audioButton={audioButton}
					onPlay={handlePlay}
					searchQuery={searchQuery}
					isFavorite={favoriteStates?.get(audioButton.id) || false}
					onFavoriteToggle={() => onFavoriteToggle?.(audioButton.id)}
					showDetailLink={showDetailLink}
					isAuthenticated={isAuthenticated}
					className={cn(
						"shadow-sm hover:shadow-md transition-all duration-200",
						isCurrentlyPlaying && "ring-2 ring-minase-300",
					)}
					highlightClassName="bg-suzuka-200 text-suzuka-900 px-1 rounded"
				/>
			)}
		</div>
	);
});

ProgressiveListItem.displayName = "ProgressiveListItem";

/**
 * プログレッシブ音声ボタンリスト
 *
 * 特徴:
 * - 段階的ローディング（スケルトン → プレビュー → 完全版）
 * - 仮想化によるパフォーマンス最適化
 * - ユーザー操作に応じた動的アップグレード
 * - メモリ使用量の段階的制御
 */
export const ProgressiveAudioButtonList = memo<ProgressiveAudioButtonListProps>(
	({
		audioButtons,
		onPlay,
		searchQuery,
		favoriteStates,
		onFavoriteToggle,
		currentPlayingId,
		height = 800,
		itemSize = 140,
		className,
		showDetailLink = true,
		isAuthenticated,
		emptyMessage = "音声ボタンが見つかりませんでした",
		onItemClick,
		overscanCount = 5,
		isLoading = false,
		previewBufferSize = 5,
		autoUpgrade = false,
	}) => {
		const [visibleRange, setVisibleRange] = useState({ start: 0, end: 5 });
		const { upgradeItem, isUpgraded, upgradedCount } = useProgressiveLoading();

		// 表示範囲更新ハンドラー
		const handleItemsRendered = useCallback(
			({
				visibleStartIndex,
				visibleStopIndex,
			}: {
				visibleStartIndex: number;
				visibleStopIndex: number;
			}) => {
				setVisibleRange({ start: visibleStartIndex, end: visibleStopIndex });

				// 自動アップグレード機能
				if (autoUpgrade) {
					for (let i = visibleStartIndex; i <= visibleStopIndex; i++) {
						const audioButton = audioButtons[i];
						if (i < audioButtons.length && audioButton && !isUpgraded(audioButton.id)) {
							upgradeItem(audioButton.id);
						}
					}
				}
			},
			[autoUpgrade, audioButtons, isUpgraded, upgradeItem],
		);

		// リストデータのメモ化
		const itemData = useMemo(
			() => ({
				audioButtons,
				onPlay,
				searchQuery,
				favoriteStates,
				onFavoriteToggle,
				currentPlayingId,
				onItemClick,
				showDetailLink,
				isAuthenticated,
				visibleRange,
				upgradedItems: new Set(
					audioButtons.filter((button) => isUpgraded(button.id)).map((button) => button.id),
				),
				upgradeItem,
				previewBufferSize,
				isLoading,
			}),
			[
				audioButtons,
				onPlay,
				searchQuery,
				favoriteStates,
				onFavoriteToggle,
				currentPlayingId,
				onItemClick,
				showDetailLink,
				isAuthenticated,
				visibleRange,
				isUpgraded,
				upgradeItem,
				previewBufferSize,
				isLoading,
			],
		);

		// 空状態の表示
		if (audioButtons.length === 0 && !isLoading) {
			return (
				<div className={cn("flex items-center justify-center", className)} style={{ height }}>
					<p className="text-muted-foreground text-center">{emptyMessage}</p>
				</div>
			);
		}

		return (
			<div className={className}>
				{/* パフォーマンス統計（開発環境のみ） */}
				{process.env.NODE_ENV === "development" && (
					<div className="mb-2 text-xs text-muted-foreground">
						<span>
							アップグレード済み: {upgradedCount}/{audioButtons.length} | 表示範囲:{" "}
							{visibleRange.start}-{visibleRange.end}
						</span>
					</div>
				)}

				<List
					height={height}
					width="100%"
					itemCount={audioButtons.length}
					itemSize={itemSize}
					itemData={itemData}
					overscanCount={overscanCount}
					onItemsRendered={handleItemsRendered}
				>
					{ProgressiveListItem}
				</List>
			</div>
		);
	},
);

ProgressiveAudioButtonList.displayName = "ProgressiveAudioButtonList";

/**
 * プログレッシブローディングメトリクス
 */
export const useProgressiveLoadingMetrics = (
	totalItems: number,
	upgradedCount: number,
	visibleRange: { start: number; end: number },
) => {
	return useMemo(() => {
		const upgradeRatio = totalItems > 0 ? (upgradedCount / totalItems) * 100 : 0;
		const visibleCount = visibleRange.end - visibleRange.start + 1;
		const memoryUsage = upgradedCount * 2 + (totalItems - upgradedCount) * 0.1; // MB概算

		return {
			totalItems,
			upgradedCount,
			upgradeRatio: `${upgradeRatio.toFixed(1)}%`,
			visibleCount,
			memoryUsage: `${memoryUsage.toFixed(1)}MB`,
			isEfficient: upgradeRatio < 30, // 30%未満のアップグレードが効率的
		};
	}, [totalItems, upgradedCount, visibleRange]);
};
