/**
 * VideoTagDisplay - 動画タグ表示コンポーネント
 * 配信タイプ、みんなのタグ、ジャンルを統合表示
 * 旧名: ThreeLayerTagDisplay（後方互換性のため名前は残す）
 */

"use client";

import { cn } from "@suzumina.click/ui/lib/utils";
import { Play, Users } from "lucide-react";
import { buildCompactTags } from "./three-layer-tag-display/buildCompactTags";
import { CategoryDisplay } from "./three-layer-tag-display/CategoryDisplay";
import { CompactTagDisplay } from "./three-layer-tag-display/CompactTagDisplay";
import { getSizeClasses } from "./three-layer-tag-display/getSizeClasses";
import { TagLayer } from "./three-layer-tag-display/TagLayer";

export interface VideoTagDisplayProps {
	/** 配信タイプタグ（自動分類） */
	playlistTags?: string[];
	/** みんなのタグ（ユーザー投稿） */
	userTags?: string[];
	/** ジャンルID（YouTube分類） */
	categoryId?: string;
	/** ジャンル表示名 */
	categoryName?: string;
	/** 検索クエリ（ハイライト機能用） */
	searchQuery?: string;
	/** ハイライト時のクラス名 */
	highlightClassName?: string;
	/** コンテナのクラス名 */
	className?: string;
	/** タグクリック時のコールバック */
	onTagClick?: (tag: string, layer: "playlist" | "user" | "category") => void;
	/** 表示サイズ */
	size?: "sm" | "default" | "lg";
	/** 各層の最大表示タグ数（0の場合は制限なし） */
	maxTagsPerLayer?: number;
	/** 空の層を表示するかどうか */
	showEmptyLayers?: boolean;
	/** ジャンルを表示するかどうか */
	showCategory?: boolean;
	/** 一列表示モード（コンパクト表示） */
	compact?: boolean;
	/** 表示順序（通常: playlist→user→category, 詳細: category→playlist→user） */
	order?: "default" | "detail";
}

export function VideoTagDisplay({
	playlistTags = [],
	userTags = [],
	categoryId,
	categoryName,
	searchQuery,
	highlightClassName,
	className,
	onTagClick,
	size = "default",
	maxTagsPerLayer = 0,
	showEmptyLayers = false,
	showCategory = true,
	compact = false,
	order = "default",
}: VideoTagDisplayProps) {
	const sizeClasses = getSizeClasses(size);

	// 表示するタグを制限
	const getDisplayTags = (tags: string[]) => {
		if (maxTagsPerLayer > 0) {
			return {
				displayed: tags.slice(0, maxTagsPerLayer),
				hasMore: tags.length > maxTagsPerLayer,
				moreCount: tags.length - maxTagsPerLayer,
			};
		}
		return {
			displayed: tags,
			hasMore: false,
			moreCount: 0,
		};
	};

	// 各層の表示データ
	const playlistDisplay = getDisplayTags(playlistTags);
	const userDisplay = getDisplayTags(userTags);

	// すべての層が空の場合
	if (!showEmptyLayers && playlistTags.length === 0 && userTags.length === 0 && !categoryId) {
		return null;
	}

	// コンパクト表示の場合
	if (compact) {
		const allTags = buildCompactTags({
			order,
			showCategory,
			categoryId,
			categoryName,
			playlistTags,
			userTags,
			maxTagsPerLayer,
		});

		return (
			<CompactTagDisplay
				allTags={allTags}
				sizeClasses={sizeClasses}
				onTagClick={onTagClick}
				searchQuery={searchQuery}
				highlightClassName={highlightClassName}
				className={className}
			/>
		);
	}

	// 通常表示（従来の表示）
	const playlistLayer = (
		<TagLayer
			title="配信タイプ"
			icon={Play}
			tags={playlistTags}
			layer="playlist"
			badgeClassName="bg-suzuka-500 text-white border-suzuka-500 hover:bg-suzuka-600"
			displayData={playlistDisplay}
			sizeClasses={sizeClasses}
			showEmptyLayers={showEmptyLayers}
			onTagClick={onTagClick}
			searchQuery={searchQuery}
			highlightClassName={highlightClassName}
		/>
	);

	const userLayer = (
		<TagLayer
			title="みんなのタグ"
			icon={Users}
			tags={userTags}
			layer="user"
			badgeClassName="bg-suzuka-50 text-suzuka-700 border-suzuka-200 hover:bg-suzuka-100"
			displayData={userDisplay}
			sizeClasses={sizeClasses}
			showEmptyLayers={showEmptyLayers}
			onTagClick={onTagClick}
			searchQuery={searchQuery}
			highlightClassName={highlightClassName}
		/>
	);

	const categoryLayer = showCategory && categoryId && categoryName && (
		<CategoryDisplay
			categoryName={categoryName}
			sizeClasses={sizeClasses}
			onTagClick={onTagClick}
			searchQuery={searchQuery}
			highlightClassName={highlightClassName}
		/>
	);

	if (order === "detail") {
		// 詳細ページ用順序: ジャンル→配信タイプ→みんなのタグ
		return (
			<div className={cn("space-y-4", className)}>
				{categoryLayer}
				{playlistLayer}
				{userLayer}
			</div>
		);
	}

	// 通常表示（一覧ページ用順序）
	return (
		<div className={cn("space-y-4", className)}>
			{playlistLayer}
			{userLayer}
			{categoryLayer}
		</div>
	);
}

// 後方互換性のため旧名も残す
export const ThreeLayerTagDisplay = VideoTagDisplay;
export type ThreeLayerTagDisplayProps = VideoTagDisplayProps;
