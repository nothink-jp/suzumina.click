/**
 * VideoTagDisplay - 動画タグ表示コンポーネント
 * 配信タイプ、みんなのタグ、ジャンルを統合表示
 * 旧名: ThreeLayerTagDisplay（後方互換性のため名前は残す）
 */

"use client";

import { Badge } from "@suzumina.click/ui/components/ui/badge";
import { cn } from "@suzumina.click/ui/lib/utils";
import { FolderOpen, Play, Users } from "lucide-react";
import type { MouseEvent } from "react";
import { HighlightText } from "./highlight-text";

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
	// サイズに応じたクラス名
	const getSizeClasses = () => {
		switch (size) {
			case "sm":
				return {
					container: "gap-1",
					layerContainer: "gap-1",
					badge: "text-xs h-6",
					icon: "h-2.5 w-2.5 mr-0.5",
					title: "text-xs",
				};
			case "lg":
				return {
					container: "gap-4",
					layerContainer: "gap-3",
					badge: "text-sm h-8",
					icon: "h-4 w-4 mr-1.5",
					title: "text-sm",
				};
			default:
				return {
					container: "gap-3",
					layerContainer: "gap-2",
					badge: "text-xs h-7",
					icon: "h-3 w-3 mr-1",
					title: "text-sm",
				};
		}
	};

	const sizeClasses = getSizeClasses();

	// タグクリックハンドラー
	const handleTagClick = (
		tag: string,
		layer: "playlist" | "user" | "category",
		event: MouseEvent<HTMLElement>,
	) => {
		if (onTagClick) {
			event.preventDefault();
			event.stopPropagation();
			onTagClick(tag, layer);
		}
	};

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

	// レイヤー表示コンポーネント
	const renderTagLayer = (
		title: string,
		icon: React.ComponentType<{ className?: string }>,
		tags: string[],
		layer: "playlist" | "user" | "category",
		badgeClassName: string,
		displayData: { displayed: string[]; hasMore: boolean; moreCount: number },
	) => {
		if (!showEmptyLayers && tags.length === 0) return null;

		const IconComponent = icon;

		return (
			<div className="space-y-2">
				<h4
					className={cn("font-medium text-muted-foreground flex items-center", sizeClasses.title)}
				>
					<IconComponent className={sizeClasses.icon} />
					{title}
					{/* ユーザー向け説明テキスト */}
					{layer === "playlist" && (
						<span className="text-xs text-muted-foreground ml-2">(録画時間による自動分類)</span>
					)}
					{layer === "user" && (
						<span className="text-xs text-muted-foreground ml-2">(ユーザーが自由に追加)</span>
					)}
				</h4>
				<div className={cn("flex flex-wrap", sizeClasses.layerContainer)}>
					{displayData.displayed.map((tag, index) => (
						<Badge
							key={`${tag}-${index}`}
							className={cn(
								sizeClasses.badge,
								badgeClassName,
								onTagClick && "cursor-pointer",
								"transition-all duration-200",
							)}
							onClick={onTagClick ? (e) => handleTagClick(tag, layer, e) : undefined}
						>
							{searchQuery ? (
								<HighlightText
									text={tag}
									searchQuery={searchQuery}
									highlightClassName={
										highlightClassName || "bg-yellow-200 text-yellow-900 px-1 rounded"
									}
								/>
							) : (
								tag
							)}
						</Badge>
					))}
					{displayData.hasMore && (
						<Badge
							variant="outline"
							className={cn(sizeClasses.badge, "text-muted-foreground bg-muted/30")}
						>
							+{displayData.moreCount}個
						</Badge>
					)}
					{tags.length === 0 && showEmptyLayers && (
						<span className="text-xs text-muted-foreground italic">設定なし</span>
					)}
				</div>
			</div>
		);
	};

	// すべての層が空の場合
	if (!showEmptyLayers && playlistTags.length === 0 && userTags.length === 0 && !categoryId) {
		return null;
	}

	// コンパクト表示の場合
	if (compact) {
		const allTags: Array<{
			text: string;
			type: "category" | "playlist" | "user";
			className: string;
		}> = [];

		if (order === "detail") {
			// 詳細ページ用順序: ジャンル→配信タイプ→みんなのタグ

			// 1. ジャンル（優先度1）
			if (showCategory && categoryId && categoryName) {
				allTags.push({
					text: categoryName,
					type: "category",
					className: "bg-suzuka-700 text-white border-suzuka-700 hover:bg-suzuka-800",
				});
			}

			// 2. 配信タイプ（優先度2）
			const displayPlaylistTags =
				maxTagsPerLayer > 0 ? playlistTags.slice(0, maxTagsPerLayer) : playlistTags;
			for (const tag of displayPlaylistTags) {
				allTags.push({
					text: tag,
					type: "playlist",
					className: "bg-suzuka-500 text-white border-suzuka-500 hover:bg-suzuka-600",
				});
			}

			// 3. みんなのタグ（優先度3）
			const remainingSpace =
				maxTagsPerLayer > 0 ? Math.max(0, maxTagsPerLayer - allTags.length) : userTags.length;
			const displayUserTags = userTags.slice(0, remainingSpace);
			for (const tag of displayUserTags) {
				allTags.push({
					text: tag,
					type: "user",
					className: "bg-suzuka-50 text-suzuka-700 border-suzuka-200 hover:bg-suzuka-100",
				});
			}
		} else {
			// 通常ページ用順序: カテゴリ→配信タイプ→みんなのタグ

			// 1. カテゴリ（優先度1）
			if (showCategory && categoryId && categoryName) {
				allTags.push({
					text: categoryName,
					type: "category",
					className: "bg-suzuka-700 text-white border-suzuka-700 hover:bg-suzuka-800",
				});
			}

			// 2. 配信タイプ（優先度2）
			const displayPlaylistTags =
				maxTagsPerLayer > 0 ? playlistTags.slice(0, maxTagsPerLayer) : playlistTags;
			for (const tag of displayPlaylistTags) {
				allTags.push({
					text: tag,
					type: "playlist",
					className: "bg-suzuka-500 text-white border-suzuka-500 hover:bg-suzuka-600",
				});
			}

			// 3. みんなのタグ（優先度3）
			const remainingSpace =
				maxTagsPerLayer > 0 ? Math.max(0, maxTagsPerLayer - allTags.length) : userTags.length;
			const displayUserTags = userTags.slice(0, remainingSpace);
			for (const tag of displayUserTags) {
				allTags.push({
					text: tag,
					type: "user",
					className: "bg-suzuka-50 text-suzuka-700 border-suzuka-200 hover:bg-suzuka-100",
				});
			}
		}

		return (
			<div className={cn("flex flex-wrap", sizeClasses.layerContainer, className)}>
				{allTags.map((tag, index) => (
					<Badge
						key={`${tag.type}-${tag.text}-${index}`}
						className={cn(
							sizeClasses.badge,
							tag.className,
							onTagClick && "cursor-pointer",
							"transition-all duration-200",
						)}
						onClick={onTagClick ? (e) => handleTagClick(tag.text, tag.type, e) : undefined}
					>
						{searchQuery ? (
							<HighlightText
								text={tag.text}
								searchQuery={searchQuery}
								highlightClassName={
									highlightClassName || "bg-yellow-200 text-yellow-900 px-1 rounded"
								}
							/>
						) : (
							tag.text
						)}
					</Badge>
				))}
				{/* 残りのタグ数表示 */}
				{maxTagsPerLayer > 0 &&
					playlistTags.length + userTags.length + (categoryName ? 1 : 0) > allTags.length && (
						<Badge
							variant="outline"
							className={cn(sizeClasses.badge, "text-muted-foreground bg-muted/30")}
						>
							+{playlistTags.length + userTags.length + (categoryName ? 1 : 0) - allTags.length}個
						</Badge>
					)}
			</div>
		);
	}

	// 通常表示（従来の表示）
	if (order === "detail") {
		// 詳細ページ用順序: ジャンル→配信タイプ→みんなのタグ
		return (
			<div className={cn("space-y-4", className)}>
				{/* 1. ジャンル（YouTube分類） */}
				{showCategory && categoryId && categoryName && (
					<div className="space-y-2">
						<h4
							className={cn(
								"font-medium text-muted-foreground flex items-center",
								sizeClasses.title,
							)}
						>
							<FolderOpen className={sizeClasses.icon} />
							ジャンル
							{/* ユーザー向け説明テキスト */}
							<span className="text-xs text-muted-foreground ml-2">(YouTube分類)</span>
						</h4>
						<div className={cn("flex flex-wrap", sizeClasses.layerContainer)}>
							<Badge
								className={cn(
									sizeClasses.badge,
									"bg-suzuka-700 text-white border-suzuka-700 hover:bg-suzuka-800",
									onTagClick && "cursor-pointer",
									"transition-all duration-200",
								)}
								onClick={
									onTagClick ? (e) => handleTagClick(categoryName, "category", e) : undefined
								}
							>
								{searchQuery ? (
									<HighlightText
										text={categoryName}
										searchQuery={searchQuery}
										highlightClassName={
											highlightClassName || "bg-yellow-200 text-yellow-900 px-1 rounded"
										}
									/>
								) : (
									categoryName
								)}
							</Badge>
						</div>
					</div>
				)}

				{/* 2. 配信タイプタグ（自動分類） */}
				{renderTagLayer(
					"配信タイプ",
					Play,
					playlistTags,
					"playlist",
					"bg-suzuka-500 text-white border-suzuka-500 hover:bg-suzuka-600",
					playlistDisplay,
				)}

				{/* 3. みんなのタグ（ユーザー投稿） */}
				{renderTagLayer(
					"みんなのタグ",
					Users,
					userTags,
					"user",
					"bg-suzuka-50 text-suzuka-700 border-suzuka-200 hover:bg-suzuka-100",
					userDisplay,
				)}
			</div>
		);
	}

	// 通常表示（一覧ページ用順序）
	return (
		<div className={cn("space-y-4", className)}>
			{/* 1. 配信タイプタグ（自動分類） */}
			{renderTagLayer(
				"配信タイプ",
				Play,
				playlistTags,
				"playlist",
				"bg-suzuka-500 text-white border-suzuka-500 hover:bg-suzuka-600",
				playlistDisplay,
			)}

			{/* 2. みんなのタグ（ユーザー投稿） */}
			{renderTagLayer(
				"みんなのタグ",
				Users,
				userTags,
				"user",
				"bg-suzuka-50 text-suzuka-700 border-suzuka-200 hover:bg-suzuka-100",
				userDisplay,
			)}

			{/* 3. ジャンル（YouTube分類） */}
			{showCategory && categoryId && categoryName && (
				<div className="space-y-2">
					<h4
						className={cn("font-medium text-muted-foreground flex items-center", sizeClasses.title)}
					>
						<FolderOpen className={sizeClasses.icon} />
						ジャンル
						{/* ユーザー向け説明テキスト */}
						<span className="text-xs text-muted-foreground ml-2">(YouTube分類)</span>
					</h4>
					<div className={cn("flex flex-wrap", sizeClasses.layerContainer)}>
						<Badge
							className={cn(
								sizeClasses.badge,
								"bg-suzuka-700 text-white border-suzuka-700 hover:bg-suzuka-800",
								onTagClick && "cursor-pointer",
								"transition-all duration-200",
							)}
							onClick={onTagClick ? (e) => handleTagClick(categoryName, "category", e) : undefined}
						>
							{searchQuery ? (
								<HighlightText
									text={categoryName}
									searchQuery={searchQuery}
									highlightClassName={
										highlightClassName || "bg-yellow-200 text-yellow-900 px-1 rounded"
									}
								/>
							) : (
								categoryName
							)}
						</Badge>
					</div>
				</div>
			)}
		</div>
	);
}

// 後方互換性のため旧名も残す
export const ThreeLayerTagDisplay = VideoTagDisplay;
export type ThreeLayerTagDisplayProps = VideoTagDisplayProps;
