/**
 * 音声ボタンプレビューコンポーネント - Phase 2c レイジーローディング実装
 *
 * 設計特徴:
 * - スケルトンから完全版への中間段階
 * - 基本情報のみ表示（YouTube Player無し）
 * - 軽量レンダリング最適化
 * - プログレッシブエンハンスメント対応
 */

"use client";

import type { FrontendAudioButtonData } from "@suzumina.click/shared-types";
import { Heart, Play } from "lucide-react";
import { memo, useCallback, useState } from "react";
import { cn } from "../../lib/utils";
import { HighlightText } from "./highlight-text";

export interface AudioButtonPreviewProps {
	/** 音声ボタンデータ */
	audioButton: FrontendAudioButtonData;

	/** 検索クエリ（ハイライト用） */
	searchQuery?: string;

	/** お気に入り初期状態 */
	initialIsFavorited?: boolean;

	/** お気に入り切り替えハンドラー */
	onFavoriteToggle?: () => void;

	/** プレビュー→完全版切り替えハンドラー */
	onUpgrade?: () => void;

	/** 追加CSSクラス */
	className?: string;

	/** ハイライトCSSクラス */
	highlightClassName?: string;

	/** 詳細リンク表示 */
	showDetailLink?: boolean;
}

/**
 * 音声ボタンプレビューコンポーネント
 *
 * 特徴:
 * - YouTube Player無しの軽量版
 * - 基本情報とメタデータ表示
 * - お気に入り機能対応
 * - クリック時にフル版へアップグレード
 */
export const AudioButtonPreview = memo<AudioButtonPreviewProps>(
	({
		audioButton,
		searchQuery,
		initialIsFavorited = false,
		onFavoriteToggle,
		onUpgrade,
		className,
		highlightClassName = "bg-suzuka-200 text-suzuka-900 px-1 rounded",
		showDetailLink = true,
	}) => {
		const [isFavorited, setIsFavorited] = useState(initialIsFavorited);

		const handleFavoriteClick = useCallback(
			(e: React.MouseEvent) => {
				e.stopPropagation();
				setIsFavorited(!isFavorited);
				onFavoriteToggle?.();
			},
			[isFavorited, onFavoriteToggle],
		);

		const handlePlayClick = useCallback(
			(e: React.MouseEvent) => {
				e.stopPropagation();
				onUpgrade?.();
			},
			[onUpgrade],
		);

		return (
			<div
				className={cn(
					"w-full border border-border rounded-lg p-4 bg-card transition-all duration-200 hover:shadow-md cursor-pointer",
					className,
				)}
				onClick={onUpgrade}
				data-testid={`audio-button-preview-${audioButton.id}`}
				role="button"
				tabIndex={0}
				onKeyDown={(e) => {
					if (e.key === "Enter" || e.key === " ") {
						e.preventDefault();
						onUpgrade?.();
					}
				}}
			>
				{/* ヘッダー部分 */}
				<div className="flex items-start justify-between mb-3">
					<div className="flex-1 min-w-0">
						{/* タイトル */}
						<h3 className="font-medium text-sm leading-tight text-foreground truncate">
							<HighlightText
								text={audioButton.title}
								searchQuery={searchQuery || ""}
								highlightClassName={highlightClassName}
							/>
						</h3>
						{/* 説明 */}
						{audioButton.description && (
							<p className="text-xs text-muted-foreground mt-1 line-clamp-2">
								<HighlightText
									text={audioButton.description}
									searchQuery={searchQuery || ""}
									highlightClassName={highlightClassName}
								/>
							</p>
						)}
					</div>

					{/* お気に入りボタン */}
					<button
						type="button"
						onClick={handleFavoriteClick}
						className={cn(
							"p-1 rounded transition-colors ml-2 flex-shrink-0",
							isFavorited
								? "text-red-500 hover:text-red-600"
								: "text-muted-foreground hover:text-foreground",
						)}
						aria-label={isFavorited ? "お気に入りから削除" : "お気に入りに追加"}
					>
						<Heart size={16} className={cn("transition-all", isFavorited && "fill-current")} />
					</button>
				</div>

				{/* 再生ボタンとタグエリア */}
				<div className="flex items-center justify-between mb-3">
					{/* 再生ボタン（プレビュー版） */}
					<button
						type="button"
						onClick={handlePlayClick}
						className="inline-flex items-center gap-1 px-2 py-1 bg-minase-500 text-white rounded text-xs hover:bg-minase-600 transition-colors"
						aria-label="音声を再生"
					>
						<Play size={12} />
						<span>再生</span>
					</button>

					{/* タグ */}
					<div className="flex gap-1 flex-wrap">
						{audioButton.tags.slice(0, 2).map((tag) => (
							<span
								key={tag}
								className="inline-block px-2 py-0.5 bg-muted text-muted-foreground rounded-full text-xs"
							>
								<HighlightText
									text={tag}
									searchQuery={searchQuery || ""}
									highlightClassName={highlightClassName}
								/>
							</span>
						))}
						{audioButton.tags.length > 2 && (
							<span className="inline-block px-2 py-0.5 bg-muted text-muted-foreground rounded-full text-xs">
								+{audioButton.tags.length - 2}
							</span>
						)}
					</div>
				</div>

				{/* 下部メタデータ */}
				<div className="flex items-center justify-between text-xs text-muted-foreground">
					<div className="flex items-center gap-2">
						<span>{audioButton.durationText}</span>
						<span>•</span>
						<span>{audioButton.createdByName}</span>
					</div>
					<div className="flex items-center gap-2">
						<span>{audioButton.relativeTimeText}</span>
						{showDetailLink && (
							<>
								<span>•</span>
								<span className="text-minase-600 hover:text-minase-700 cursor-pointer">詳細</span>
							</>
						)}
					</div>
				</div>

				{/* プレビュー表示インジケーター */}
				<div className="mt-2 text-xs text-muted-foreground">
					<span className="opacity-75">クリックして完全版を読み込み</span>
				</div>
			</div>
		);
	},
);

AudioButtonPreview.displayName = "AudioButtonPreview";

/**
 * プレビュー表示条件判定
 */
export const shouldShowPreview = (
	index: number,
	visibleRange: { start: number; end: number },
	bufferSize = 5,
): boolean => {
	// 表示領域の前後bufferSize分はプレビュー表示
	return index >= visibleRange.start - bufferSize && index <= visibleRange.end + bufferSize;
};

/**
 * プレビューからフル版への段階的アップグレード管理
 */
export const useProgressiveLoading = () => {
	const [upgradedItems, setUpgradedItems] = useState<Set<string>>(new Set());

	const upgradeItem = useCallback((id: string) => {
		setUpgradedItems((prev) => new Set(prev).add(id));
	}, []);

	const isUpgraded = useCallback(
		(id: string) => {
			return upgradedItems.has(id);
		},
		[upgradedItems],
	);

	const reset = useCallback(() => {
		setUpgradedItems(new Set());
	}, []);

	return {
		upgradeItem,
		isUpgraded,
		reset,
		upgradedCount: upgradedItems.size,
	};
};
