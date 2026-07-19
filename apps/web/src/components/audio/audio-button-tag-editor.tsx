/**
 * 音声ボタンタグ編集コンポーネント
 * 音声ボタン作成・編集時のタグ管理
 */

"use client";

import { AUDIO_BUTTON_USAGE_TAGS, isAudioButtonUsageTag } from "@suzumina.click/shared-types";
import { TagInput, type TagSuggestion } from "@suzumina.click/ui/components/custom/tag-input";
import { cn } from "@suzumina.click/ui/lib/utils";
import { Tag } from "lucide-react";
import { useCallback } from "react";
import { type AutocompleteSuggestion, getAutocompleteSuggestions } from "@/actions/autocomplete";

export interface AudioButtonTagEditorProps {
	/** 現在のタグ配列 */
	tags: string[];
	/** タグ変更時のコールバック */
	onTagsChange: (tags: string[]) => void;
	/** 最大タグ数 (デフォルト: 10) */
	maxTags?: number;
	/** 各タグの最大文字数 (デフォルト: 30) */
	maxTagLength?: number;
	/** 入力無効状態 */
	disabled?: boolean;
	/** 追加のクラス名 */
	className?: string;
	/** オートコンプリート機能を有効にする (デフォルト: true) */
	enableAutocompletion?: boolean;
}

export function AudioButtonTagEditor({
	tags,
	onTagsChange,
	maxTags = 10,
	maxTagLength = 30,
	disabled = false,
	className,
	enableAutocompletion = true,
}: AudioButtonTagEditorProps) {
	/**
	 * AutocompleteSuggestion を TagSuggestion に変換
	 */
	const convertToTagSuggestion = useCallback(
		(suggestion: AutocompleteSuggestion): TagSuggestion => {
			return {
				id: suggestion.id,
				text: suggestion.text,
				type: suggestion.type === "tag" ? "tag" : "custom",
				category: suggestion.category,
				icon: suggestion.icon,
				count: suggestion.count,
				description: suggestion.type === "tag" ? undefined : `${suggestion.type}から候補`,
			};
		},
		[],
	);

	/**
	 * タグ候補を取得する
	 */
	const handleSuggestionsFetch = useCallback(
		async (query: string): Promise<TagSuggestion[]> => {
			try {
				const result = await getAutocompleteSuggestions(query);
				if (result.success) {
					// タグタイプの候補のみを抽出して変換
					const tagSuggestions = result.data.suggestions
						.filter((suggestion) => suggestion.type === "tag")
						.map(convertToTagSuggestion);
					return tagSuggestions;
				}
				return [];
			} catch (_error) {
				return [];
			}
		},
		[convertToTagSuggestion],
	);
	/**
	 * 「用途タグは1ボタン1つ」（SPR-260）の不変条件をここで一元的に強制する。
	 * チップ経由だけでなくフリー入力・オートコンプリート経由（用途タグは本番付与済みで
	 * 候補に出る）でも2つ目が混入しうるため、後から入った用途タグを残して置換する
	 */
	const enforceSingleUsageTag = useCallback(
		(next: string[]) => {
			const usage = next.filter(isAudioButtonUsageTag);
			if (usage.length <= 1) {
				onTagsChange(next);
				return;
			}
			const keep = usage[usage.length - 1];
			onTagsChange(next.filter((t) => !isAudioButtonUsageTag(t) || t === keep));
		},
		[onTagsChange],
	);

	/** 用途タグチップのトグル（付与済みタップで解除・別カテゴリで入れ替え） */
	const handleUsageTagToggle = useCallback(
		(usageTag: string) => {
			if (tags.includes(usageTag)) {
				onTagsChange(tags.filter((t) => t !== usageTag));
				return;
			}
			const withoutUsage = tags.filter((t) => !isAudioButtonUsageTag(t));
			if (withoutUsage.length >= maxTags) return;
			onTagsChange([...withoutUsage, usageTag]);
		},
		[tags, onTagsChange, maxTags],
	);

	return (
		<div className={cn("space-y-2", className)}>
			<label
				htmlFor="tag-input"
				className="text-sm sm:text-base font-medium flex items-center gap-2"
			>
				<Tag className="h-4 w-4" />
				タグ（任意）
			</label>

			{/* 用途タグのプリセットチップ（公式語彙・1つまで） */}
			<div className="space-y-1">
				<p className="text-xs text-muted-foreground">
					どんな場面で使うボタン？（1つ選べます・タップで解除）
				</p>
				<div className="flex flex-wrap gap-1.5">
					{AUDIO_BUTTON_USAGE_TAGS.map((usageTag) => {
						const active = tags.includes(usageTag);
						return (
							<button
								key={usageTag}
								type="button"
								disabled={disabled}
								onClick={() => handleUsageTagToggle(usageTag)}
								aria-pressed={active}
								className={cn(
									"rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
									"focus-visible:outline-3 focus-visible:outline-suzuka-400 focus-visible:outline-offset-2",
									"disabled:pointer-events-none disabled:opacity-50",
									active
										? "border-suzuka-500 bg-suzuka-500 text-white"
										: "border-border bg-card text-muted-foreground hover:border-suzuka-300 hover:text-foreground",
								)}
							>
								{usageTag}
							</button>
						);
					})}
				</div>
			</div>

			<TagInput
				tags={tags}
				onTagsChange={enforceSingleUsageTag}
				maxTags={maxTags}
				maxTagLength={maxTagLength}
				placeholder="タグを入力してEnter (2文字以上で候補表示)"
				disabled={disabled}
				enableAutocompletion={enableAutocompletion}
				onSuggestionsFetch={enableAutocompletion ? handleSuggestionsFetch : undefined}
				debounceMs={300}
				minSearchLength={2}
				maxSuggestions={8}
			/>
		</div>
	);
}
