/**
 * 音声ボタンスケルトンコンポーネント - Phase 2c レイジーローディング実装
 *
 * 設計特徴:
 * - 初期表示時の軽量プレースホルダー
 * - v0モック準拠のスケルトンUI
 * - 高速レンダリング対応
 * - アニメーション付きローディング表示
 */

"use client";

import { memo } from "react";
import { cn } from "../../lib/utils";

export interface AudioButtonSkeletonProps {
	/** スケルトンの高さ */
	height?: number;

	/** 追加CSSクラス */
	className?: string;

	/** アニメーション有効化 */
	animated?: boolean;
}

/**
 * 音声ボタンスケルトンコンポーネント
 *
 * 用途:
 * - 仮想化リストの初期表示
 * - ネットワーク遅延時の表示
 * - プログレッシブローディング
 */
export const AudioButtonSkeleton = memo<AudioButtonSkeletonProps>(
	({ height = 140, className, animated = true }) => {
		return (
			<div
				className={cn(
					"w-full border border-border rounded-lg p-4 bg-card",
					animated && "animate-pulse",
					className,
				)}
				style={{ height: `${height}px` }}
				data-testid="audio-button-skeleton"
			>
				{/* ヘッダー部分 */}
				<div className="flex items-start justify-between mb-3">
					<div className="flex-1">
						{/* タイトル */}
						<div className="h-5 bg-muted rounded w-3/4 mb-2" />
						{/* 説明 */}
						<div className="h-4 bg-muted rounded w-1/2" />
					</div>
					{/* お気に入りボタン */}
					<div className="h-6 w-6 bg-muted rounded ml-2" />
				</div>

				{/* 再生ボタンとタグエリア */}
				<div className="flex items-center justify-between">
					{/* 再生ボタン */}
					<div className="h-8 w-16 bg-muted rounded" />

					{/* タグ */}
					<div className="flex gap-1">
						<div className="h-5 w-12 bg-muted rounded-full" />
						<div className="h-5 w-16 bg-muted rounded-full" />
					</div>
				</div>

				{/* 下部メタデータ */}
				<div className="flex items-center justify-between mt-3 text-xs">
					<div className="h-3 bg-muted rounded w-20" />
					<div className="h-3 bg-muted rounded w-24" />
				</div>
			</div>
		);
	},
);

AudioButtonSkeleton.displayName = "AudioButtonSkeleton";

/**
 * スケルトンリスト生成ユーティリティ
 */
export const generateSkeletonList = (count: number): React.ReactNode[] => {
	return Array.from({ length: count }, (_, index) => (
		<AudioButtonSkeleton key={`skeleton-${index}`} />
	));
};

/**
 * レスポンシブスケルトン高さ計算
 */
export const calculateSkeletonHeight = (screenWidth: number): number => {
	if (screenWidth < 640) return 120; // sm未満
	if (screenWidth < 1024) return 130; // lg未満
	return 140; // デスクトップ
};
