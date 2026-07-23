/**
 * タグ入力コンポーネント
 * VIDEO_TAGS_DESIGN.md Phase 2準拠
 */

"use client";

import { Badge } from "@suzumina.click/ui/components/ui/badge";
import { Button } from "@suzumina.click/ui/components/ui/button";
import {
	Combobox,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxInput,
	ComboboxInputGroup,
	ComboboxItem,
	ComboboxList,
	ComboboxStatus,
} from "@suzumina.click/ui/components/ui/combobox";
import { cn } from "@suzumina.click/ui/lib/utils";
import { Hash, Plus, X } from "lucide-react";
import type * as React from "react";
import { useCallback, useEffect, useId, useRef, useState } from "react";

export interface TagSuggestion {
	/** 候補のID */
	id: string;
	/** 候補のテキスト */
	text: string;
	/** 候補のタイプ */
	type?: "tag" | "popular" | "recent" | "custom";
	/** 候補のカテゴリ */
	category?: string;
	/** 候補のアイコン */
	icon?: string;
	/** 候補の使用回数 */
	count?: number;
	/** 候補の説明 */
	description?: string;
}

export interface TagInputProps {
	/** 現在のタグ配列 */
	tags: string[];
	/** タグ変更時のコールバック */
	onTagsChange: (tags: string[]) => void;
	/** 最大タグ数 (デフォルト: 10) */
	maxTags?: number;
	/** 各タグの最大文字数 (デフォルト: 30) */
	maxTagLength?: number;
	/** プレースホルダーテキスト */
	placeholder?: string;
	/** 入力無効状態 */
	disabled?: boolean;
	/** 追加のクラス名 */
	className?: string;
	/** オートコンプリート機能を有効にする */
	enableAutocompletion?: boolean;
	/** 候補取得コールバック */
	onSuggestionsFetch?: (query: string) => Promise<TagSuggestion[]>;
	/** デバウンス時間（ミリ秒）*/
	debounceMs?: number;
	/** 最小検索文字数 */
	minSearchLength?: number;
	/** 最大候補表示数 */
	maxSuggestions?: number;
}

/**
 * 候補のアイコンを取得する
 */
function getSuggestionIcon(suggestion: TagSuggestion) {
	if (suggestion.icon) {
		return suggestion.icon;
	}
	switch (suggestion.type) {
		case "popular":
			return "🔥";
		case "recent":
			return "🕰️";
		case "custom":
			return "✨";
		default:
			return "🏷️";
	}
}

// Combobox の value を常に空へ制御するための安定参照（毎レンダー新規配列だと
// 不要な内部同期が走るため、モジュールスコープの定数を使い回す）。
const EMPTY_SELECTION: TagSuggestion[] = [];

export function TagInput({
	tags,
	onTagsChange,
	maxTags = 10,
	maxTagLength = 30,
	placeholder = "タグを入力...",
	disabled = false,
	className,
	enableAutocompletion = false,
	onSuggestionsFetch,
	debounceMs = 300,
	minSearchLength = 2,
	maxSuggestions = 8,
}: TagInputProps) {
	const [inputValue, setInputValue] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [suggestions, setSuggestions] = useState<TagSuggestion[]>([]);
	const [isLoading, setIsLoading] = useState(false);

	const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	// Enter キー押下時、候補がハイライトされているかを Combobox の onItemHighlighted から追跡する。
	// ハイライトが有る場合は Base UI 側の選択確定に委ね、無い場合のみ自前でフリーテキストを追加する
	// （packages/ui/src/components/ui/combobox.tsx の Async/Creatable パターンに準拠。ADR-012）。
	const highlightedRef = useRef<TagSuggestion | null>(null);
	// IME 変換区間の明示追跡。nativeEvent.isComposing / keyCode===229 は環境によって
	// confirm-Enter の時点で既に false/未設定になることがある（Base UI 自身も同じ理由で
	// Android Samsung キーボードの既知issueをコード内に注記している）。
	// compositionstart〜compositionend の区間を自前 state で持つのが最も確実。
	const isComposingRef = useRef(false);
	const errorId = useId();

	/**
	 * タグを追加する（フリーテキスト・候補選択の両方から呼ばれる正本）
	 */
	const addTag = useCallback(
		(tagText?: string) => {
			const trimmedValue = (tagText ?? inputValue).trim();

			if (!trimmedValue) {
				setError("タグを入力してください");
				return;
			}
			if (trimmedValue.length > maxTagLength) {
				setError(`タグは${maxTagLength}文字以内で入力してください`);
				return;
			}
			if (tags.length >= maxTags) {
				setError(`タグは最大${maxTags}個まで追加できます`);
				return;
			}
			if (tags.includes(trimmedValue)) {
				setError("このタグは既に追加されています");
				return;
			}

			onTagsChange([...tags, trimmedValue]);
			setInputValue("");
			setError(null);
			setSuggestions([]);
		},
		[inputValue, tags, maxTags, maxTagLength, onTagsChange],
	);

	/**
	 * タグを削除する
	 */
	const removeTag = (indexToRemove: number) => {
		onTagsChange(tags.filter((_, index) => index !== indexToRemove));
		setError(null);
	};

	/**
	 * デバウンス処理で候補を取得する
	 */
	const fetchSuggestions = useCallback(
		async (query: string) => {
			if (!enableAutocompletion || !onSuggestionsFetch || query.length < minSearchLength) {
				setSuggestions([]);
				return;
			}

			setIsLoading(true);
			try {
				const fetchedSuggestions = await onSuggestionsFetch(query);
				const filteredSuggestions = fetchedSuggestions
					.filter((suggestion) => !tags.includes(suggestion.text))
					.slice(0, maxSuggestions);
				setSuggestions(filteredSuggestions);
			} catch (error) {
				console.warn("Failed to fetch tag suggestions:", error);
				setSuggestions([]);
			} finally {
				setIsLoading(false);
			}
		},
		[enableAutocompletion, onSuggestionsFetch, minSearchLength, tags, maxSuggestions],
	);

	const debouncedFetchSuggestions = useCallback(
		(query: string) => {
			if (debounceTimeoutRef.current) {
				clearTimeout(debounceTimeoutRef.current);
			}
			debounceTimeoutRef.current = setTimeout(() => {
				fetchSuggestions(query);
			}, debounceMs);
		},
		[fetchSuggestions, debounceMs],
	);

	useEffect(() => {
		return () => {
			if (debounceTimeoutRef.current) {
				clearTimeout(debounceTimeoutRef.current);
			}
		};
	}, []);

	/**
	 * 入力値変更時の処理（IME 変換中の中間値も含めて呼ばれる）。
	 * reason "item-press" は Base UI が候補選択後に入力欄へラベルを自動補完しようとする
	 * 内部イベントで、addTag 側の明示的なクリア（setInputValue("")）と競合し値が残ってしまう。
	 * ここで無視することでフリーテキストのタグ追加と同じ「選択後は空にする」挙動へ統一する。
	 */
	const handleInputValueChange = (value: string, eventDetails?: { reason?: string }) => {
		if (eventDetails?.reason === "item-press") return;
		setInputValue(value);
		if (error) {
			setError(null);
		}

		if (enableAutocompletion && value.trim().length >= minSearchLength) {
			debouncedFetchSuggestions(value.trim());
		} else {
			setSuggestions([]);
		}
	};

	/**
	 * Enter キー押下時の処理。
	 * 候補がハイライトされている場合は Base UI 側の選択確定（onValueChange）に任せ、
	 * ハイライトが無い場合のみフリーテキストをタグとして追加する。
	 * IME 変換確定の Enter（keyCode 229）はここでも重ねてガードする
	 * （Base UI 内部の 229 チェックと二重になるが、フリーテキスト追加は独自ロジックのため必要）。
	 */
	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key !== "Enter" || highlightedRef.current) return;
		if (
			isComposingRef.current ||
			e.nativeEvent.isComposing ||
			(e.nativeEvent as unknown as { keyCode?: number }).keyCode === 229
		) {
			return;
		}
		addTag();
	};

	return (
		<div className={cn("space-y-2", className)}>
			{/* タグ表示エリア */}
			{tags.length > 0 && (
				<div className="flex flex-wrap gap-2">
					{tags.map((tag, index) => (
						<Badge key={tag} variant="secondary" className="flex items-center gap-1">
							<span className="truncate max-w-32">{tag}</span>
							{!disabled && (
								<Button
									type="button"
									variant="ghost"
									size="icon"
									className="h-4 w-4 rounded-full hover:bg-destructive hover:text-white"
									onClick={() => removeTag(index)}
									aria-label={`${tag}を削除`}
								>
									<X className="h-3 w-3" />
								</Button>
							)}
						</Badge>
					))}
				</div>
			)}

			{/* 入力エリア */}
			<Combobox
				items={suggestions}
				// single（既定）モードは Base UI 内部で `shouldFillInput` が常に true になり
				// （AriaCombobox.mjs: `single && !inputInsidePopup` 節、fillInputOnItemPress の
				// prop 指定を無視して強制発火する）、選択後に入力欄へ選択ラベルを書き戻してしまう。
				// これは inputValue を "" にリセットする本コンポーネントの「選択→即クリア」設計と
				// 相容れない。multiple モードではこの強制書き戻しが発生しないため、chips 表示
				// （Combobox.Value/Chips）は使わず選択シグナルの取得だけに multiple を用いる。
				multiple
				value={EMPTY_SELECTION}
				onValueChange={(items: TagSuggestion[]) => {
					const newest = items.at(-1);
					if (newest) addTag(newest.text);
				}}
				inputValue={inputValue}
				onInputValueChange={handleInputValueChange}
				// enableAutocompletion=false の間はポップアップ用 DOM を描画しないため、
				// Base UI 側の open 状態も明示的に false へ固定する。さもないと入力時に
				// aria-expanded="true" だけが立ち、対応する aria-controls/listbox が
				// 存在しない a11y 違反（aria-required-attr）になる
				open={enableAutocompletion ? undefined : false}
				filter={null}
				itemToStringLabel={(s: TagSuggestion) => s.text}
				onItemHighlighted={(item: TagSuggestion | undefined) => {
					highlightedRef.current = item ?? null;
				}}
			>
				<ComboboxInputGroup>
					<ComboboxInput
						onKeyDown={handleKeyDown}
						onCompositionStart={() => {
							isComposingRef.current = true;
						}}
						onCompositionEnd={() => {
							isComposingRef.current = false;
						}}
						placeholder={placeholder}
						disabled={disabled || tags.length >= maxTags}
						className={cn(error && "border-destructive focus-visible:ring-destructive/20")}
						maxLength={maxTagLength}
						aria-invalid={!!error}
						aria-describedby={error ? errorId : undefined}
					/>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={() => addTag()}
						disabled={disabled || !inputValue.trim() || tags.length >= maxTags}
						aria-label="タグを追加"
					>
						<Plus className="h-4 w-4" />
					</Button>
				</ComboboxInputGroup>

				{enableAutocompletion && (
					<ComboboxContent>
						<ComboboxStatus>{isLoading ? "候補を検索中..." : null}</ComboboxStatus>
						{!isLoading && <ComboboxEmpty>候補がありません</ComboboxEmpty>}
						<ComboboxList aria-label="タグ候補">
							{(suggestion: TagSuggestion) => (
								<ComboboxItem key={suggestion.id} value={suggestion}>
									<span className="text-sm">{getSuggestionIcon(suggestion)}</span>
									<div className="min-w-0 flex-1">
										<div className="truncate font-medium text-sm">{suggestion.text}</div>
										{suggestion.description && (
											<div className="truncate text-muted-foreground text-xs">
												{suggestion.description}
											</div>
										)}
									</div>
									{suggestion.count && (
										<div className="text-muted-foreground text-xs">{suggestion.count}</div>
									)}
								</ComboboxItem>
							)}
						</ComboboxList>
					</ComboboxContent>
				)}
			</Combobox>

			{/* エラーメッセージ */}
			{error && (
				<p id={errorId} className="text-sm text-destructive">
					{error}
				</p>
			)}

			{/* 制限情報とヘルプ */}
			<div className="flex items-center justify-between text-xs text-muted-foreground">
				<div>
					{tags.length}/{maxTags} タグ (各タグ最大{maxTagLength}文字)
				</div>
				{enableAutocompletion && (
					<div className="flex items-center gap-1 text-xs">
						<Hash className="h-3 w-3" />
						↑↓で選択、Enterで追加
					</div>
				)}
			</div>
		</div>
	);
}

// コンポーネントのエクスポート
TagInput.displayName = "TagInput";

// デフォルトエクスポート
export default TagInput;
