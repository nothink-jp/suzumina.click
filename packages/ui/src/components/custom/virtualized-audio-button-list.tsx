/**
 * 仮想化音声ボタンリスト - Phase 2 実装
 *
 * 設計特徴:
 * - react-window による仮想化
 * - 大量データ（200+件）に対応
 * - 汎用的設計（検索結果・カテゴリ別など）
 * - パフォーマンス最適化
 */

"use client";

import type { FrontendAudioButtonData } from "@suzumina.click/shared-types";
import { memo, useMemo } from "react";
import { FixedSizeList as List } from "react-window";
import { cn } from "../../lib/utils";
import { AudioButton } from "./audio-button";

export interface VirtualizedAudioButtonListProps {
	/** 表示する音声ボタンデータ */
	audioButtons: FrontendAudioButtonData[];

	/** 再生イベントハンドラー */
	onPlay?: (audioButton: FrontendAudioButtonData, index: number) => void;

	/** 検索クエリ（ハイライト用） */
	searchQuery?: string;

	/** お気に入り状態マップ */
	favoriteStates?: Map<string, boolean>;

	/** お気に入り切り替えハンドラー */
	onFavoriteToggle?: (audioButtonId: string) => void;

	/** 現在再生中の音声ボタンID */
	currentPlayingId?: string;

	/** 自動次再生（プレイリスト用） */
	autoPlayNext?: boolean;

	/** リストの高さ */
	height?: number;

	/** アイテムの高さ */
	itemSize?: number;

	/** 追加CSSクラス */
	className?: string;

	/** 詳細リンク表示 */
	showDetailLink?: boolean;

	/** 空状態メッセージ */
	emptyMessage?: string;

	/** アイテムクリックハンドラー（プレイリスト順序管理用） */
	onItemClick?: (audioButton: FrontendAudioButtonData, index: number) => void;

	/** オーバースキャン数（パフォーマンス調整用） */
	overscanCount?: number;
}

/**
 * 仮想化されたリストアイテムコンポーネント
 */
const VirtualizedListItem = memo<{
	index: number;
	style: React.CSSProperties;
	data: {
		audioButtons: FrontendAudioButtonData[];
		onPlay?: (audioButton: FrontendAudioButtonData, index: number) => void;
		searchQuery?: string;
		favoriteStates?: Map<string, boolean>;
		onFavoriteToggle?: (audioButtonId: string) => void;
		currentPlayingId?: string;
		onItemClick?: (audioButton: FrontendAudioButtonData, index: number) => void;
		showDetailLink?: boolean;
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
	} = data;

	const audioButton = audioButtons[index];

	if (!audioButton) {
		return (
			<div style={style} className="p-2">
				<div className="h-[140px] bg-muted animate-pulse rounded-lg" />
			</div>
		);
	}

	const isCurrentlyPlaying = currentPlayingId === audioButton.id;

	return (
		<div
			style={style}
			className={cn("p-2 transition-colors", isCurrentlyPlaying && "bg-minase-50")}
		>
			<AudioButton
				audioButton={audioButton}
				onPlay={() => {
					onPlay?.(audioButton, index);
					onItemClick?.(audioButton, index);
				}}
				searchQuery={searchQuery}
				isFavorite={favoriteStates?.get(audioButton.id) || false}
				onFavoriteToggle={() => onFavoriteToggle?.(audioButton.id)}
				showDetailLink={showDetailLink}
				className={cn(
					"shadow-sm hover:shadow-md transition-all duration-200",
					isCurrentlyPlaying && "ring-2 ring-minase-300",
				)}
				highlightClassName="bg-suzuka-200 text-suzuka-900 px-0.5 rounded"
			/>
		</div>
	);
});

VirtualizedListItem.displayName = "VirtualizedListItem";

/**
 * 汎用的な仮想化音声ボタンリスト
 *
 * 対応用途:
 * - メイン音声ボタン一覧
 * - 検索結果表示
 * - カテゴリ別フィルタリング
 * - プレイリスト表示
 * - タグ別一覧
 */
export const VirtualizedAudioButtonList = memo<VirtualizedAudioButtonListProps>(
	({
		audioButtons,
		onPlay,
		searchQuery,
		favoriteStates,
		onFavoriteToggle,
		currentPlayingId,
		autoPlayNext = false,
		height = 800,
		itemSize = 140,
		className,
		showDetailLink = true,
		emptyMessage = "音声ボタンが見つかりませんでした",
		onItemClick,
		overscanCount = 5,
	}) => {
		// リストデータのメモ化（パフォーマンス最適化）
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
			],
		);

		// 空状態の表示
		if (audioButtons.length === 0) {
			return (
				<div className={cn("flex items-center justify-center", className)} style={{ height }}>
					<p className="text-muted-foreground text-center">{emptyMessage}</p>
				</div>
			);
		}

		return (
			<div className={className}>
				<List
					height={height}
					width="100%"
					itemCount={audioButtons.length}
					itemSize={itemSize}
					itemData={itemData}
					overscanCount={overscanCount}
				>
					{VirtualizedListItem}
				</List>
			</div>
		);
	},
);

VirtualizedAudioButtonList.displayName = "VirtualizedAudioButtonList";

/**
 * 仮想化リスト用の計算ユーティリティ
 */
export const calculateVirtualListLayout = (
	items: FrontendAudioButtonData[],
	containerHeight: number,
	itemHeight: number,
) => {
	const totalHeight = items.length * itemHeight;
	const visibleCount = Math.ceil(containerHeight / itemHeight);
	const overscan = 5;

	return {
		totalHeight,
		visibleCount,
		overscanCount: overscan,
		itemHeight,
		bufferSize: (visibleCount + overscan * 2) * itemHeight,
		// パフォーマンス統計
		renderableItems: visibleCount + overscan * 2,
		memoryEstimate: `${((visibleCount + overscan * 2) * 2).toFixed(1)}MB`, // 概算値
	};
};

/**
 * レスポンシブアイテムサイズ計算
 */
export const calculateResponsiveItemSize = (screenWidth: number, baseSize = 140): number => {
	// モバイル: 小さめ、デスクトップ: 大きめ
	if (screenWidth < 640) return baseSize - 20; // sm未満
	if (screenWidth < 1024) return baseSize - 10; // lg未満
	return baseSize;
};

/**
 * 仮想化パフォーマンス監視用フック
 */
export const useVirtualizationMetrics = (itemCount: number, visibleCount: number) => {
	return useMemo(() => {
		const renderEfficiency = itemCount > 0 ? (visibleCount / itemCount) * 100 : 0;
		const memoryReduction = itemCount > 0 ? (1 - visibleCount / itemCount) * 100 : 0;

		return {
			totalItems: itemCount,
			renderedItems: visibleCount,
			renderEfficiency: `${renderEfficiency.toFixed(1)}%`,
			memoryReduction: `${memoryReduction.toFixed(1)}%`,
			isEfficient: renderEfficiency < 50, // 50%未満のレンダリングが効率的
		};
	}, [itemCount, visibleCount]);
};
