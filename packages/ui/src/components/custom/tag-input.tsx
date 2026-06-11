/**
 * タグ入力コンポーネント
 * VIDEO_TAGS_DESIGN.md Phase 2準拠
 */

"use client";

import { Badge } from "@suzumina.click/ui/components/ui/badge";
import { Button } from "@suzumina.click/ui/components/ui/button";
import { Input } from "@suzumina.click/ui/components/ui/input";
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
	const [isComposing, setIsComposing] = useState(false);
	const [suggestions, setSuggestions] = useState<TagSuggestion[]>([]);
	const [showSuggestions, setShowSuggestions] = useState(false);
	const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
	const [isLoading, setIsLoading] = useState(false);

	const inputRef = useRef<HTMLInputElement>(null);
	const suggestionsRef = useRef<HTMLDivElement>(null);
	const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const errorId = useId();

	/**
	 * タグを追加する
	 */
	const addTag = (tagText?: string) => {
		const trimmedValue = (tagText || inputValue).trim();

		// 入力値チェック
		if (!trimmedValue) {
			setError("タグを入力してください");
			return;
		}

		// 文字数チェック
		if (trimmedValue.length > maxTagLength) {
			setError(`タグは${maxTagLength}文字以内で入力してください`);
			return;
		}

		// 最大タグ数チェック
		if (tags.length >= maxTags) {
			setError(`タグは最大${maxTags}個まで追加できます`);
			return;
		}

		// 重複チェック
		if (tags.includes(trimmedValue)) {
			setError("このタグは既に追加されています");
			return;
		}

		// タグ追加
		onTagsChange([...tags, trimmedValue]);
		setInputValue("");
		setError(null);
		setShowSuggestions(false);
		setSelectedSuggestionIndex(-1);
		setSuggestions([]);
	};

	/**
	 * タグを削除する
	 */
	const removeTag = (indexToRemove: number) => {
		onTagsChange(tags.filter((_, index) => index !== indexToRemove));
		setError(null);
	};

	/**
	 * 候補を選択する
	 */
	const selectSuggestion = (suggestion: TagSuggestion) => {
		addTag(suggestion.text);
	};

	/**
	 * デバウンス処理で候補を取得する
	 */
	const fetchSuggestions = useCallback(
		async (query: string) => {
			if (!enableAutocompletion || !onSuggestionsFetch || query.length < minSearchLength) {
				setSuggestions([]);
				setShowSuggestions(false);
				return;
			}

			setIsLoading(true);
			try {
				const fetchedSuggestions = await onSuggestionsFetch(query);
				// 重複除外：既に追加されたタグを除外
				const filteredSuggestions = fetchedSuggestions
					.filter((suggestion) => !tags.includes(suggestion.text))
					.slice(0, maxSuggestions);

				setSuggestions(filteredSuggestions);
				setShowSuggestions(filteredSuggestions.length > 0);
				setSelectedSuggestionIndex(-1);
			} catch (error) {
				console.warn("Failed to fetch tag suggestions:", error);
				setSuggestions([]);
				setShowSuggestions(false);
			} finally {
				setIsLoading(false);
			}
		},
		[enableAutocompletion, onSuggestionsFetch, minSearchLength, tags, maxSuggestions],
	);

	/**
	 * デバウンス付き候補取得
	 */
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

	/**
	 * コンポーネントのクリーンアップ
	 */
	useEffect(() => {
		return () => {
			if (debounceTimeoutRef.current) {
				clearTimeout(debounceTimeoutRef.current);
			}
		};
	}, []);

	/**
	 * クリック外で候補を非表示にする
	 */
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				suggestionsRef.current &&
				!suggestionsRef.current.contains(event.target as Node) &&
				inputRef.current &&
				!inputRef.current.contains(event.target as Node)
			) {
				setShowSuggestions(false);
				setSelectedSuggestionIndex(-1);
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, []);

	/**
	 * 候補ナビゲーションの処理
	 */
	const handleSuggestionNavigation = (e: React.KeyboardEvent): boolean => {
		if (!showSuggestions || suggestions.length === 0) return false;

		switch (e.key) {
			case "ArrowDown":
				e.preventDefault();
				setSelectedSuggestionIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
				return true;
			case "ArrowUp":
				e.preventDefault();
				setSelectedSuggestionIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
				return true;
			case "Enter":
			case "Tab":
				if (selectedSuggestionIndex >= 0 && suggestions[selectedSuggestionIndex]) {
					e.preventDefault();
					selectSuggestion(suggestions[selectedSuggestionIndex]);
					return true;
				}
				break;
			case "Escape":
				e.preventDefault();
				setShowSuggestions(false);
				setSelectedSuggestionIndex(-1);
				return true;
		}
		return false;
	};

	/**
	 * Enter キー押下時の処理
	 * 日本語入力（IME）変換中は無視
	 */
	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (isComposing) return;

		// 候補ナビゲーションの処理
		if (handleSuggestionNavigation(e)) return;

		// Enterキーでタグ追加
		if (e.key === "Enter") {
			e.preventDefault();
			addTag();
		}
	};

	/**
	 * IME変換開始時の処理
	 */
	const handleCompositionStart = () => {
		setIsComposing(true);
	};

	/**
	 * IME変換終了時の処理
	 */
	const handleCompositionEnd = () => {
		setIsComposing(false);
	};

	/**
	 * 候補のアイコンを取得する
	 */
	const getSuggestionIcon = (suggestion: TagSuggestion) => {
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
	};

	/**
	 * 候補アイテムのレンダリング
	 */
	const renderSuggestion = (suggestion: TagSuggestion, index: number) => {
		const isSelected = index === selectedSuggestionIndex;
		return (
			<button
				key={suggestion.id}
				type="button"
				className={cn(
					"flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors w-full text-left",
					"hover:bg-muted/50",
					isSelected && "bg-muted/80",
				)}
				onClick={() => selectSuggestion(suggestion)}
				onMouseEnter={() => setSelectedSuggestionIndex(index)}
			>
				<span className="text-sm">{getSuggestionIcon(suggestion)}</span>
				<div className="flex-1 min-w-0">
					<div className="text-sm font-medium truncate">{suggestion.text}</div>
					{suggestion.description && (
						<div className="text-xs text-muted-foreground truncate">{suggestion.description}</div>
					)}
				</div>
				{suggestion.count && (
					<div className="text-xs text-muted-foreground">{suggestion.count}</div>
				)}
			</button>
		);
	};

	/**
	 * 入力値変更時の処理
	 */
	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const value = e.target.value;
		setInputValue(value);
		if (error) {
			setError(null);
		}

		// オートコンプリート機能が有効な場合、デバウンス処理で候補を取得
		if (enableAutocompletion && value.trim().length >= minSearchLength) {
			debouncedFetchSuggestions(value.trim());
		} else {
			setShowSuggestions(false);
			setSuggestions([]);
			setSelectedSuggestionIndex(-1);
		}
	};

	return (
		<div className={cn("space-y-2", className)}>
			{/* タグ表示エリア */}
			{tags.length > 0 && (
				<div className="flex flex-wrap gap-2">
					{tags.map((tag, index) => (
						<Badge key={index} variant="secondary" className="flex items-center gap-1">
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
			<div className="relative">
				<div className="flex gap-2">
					<Input
						ref={inputRef}
						type="text"
						value={inputValue}
						onChange={handleInputChange}
						onKeyDown={handleKeyDown}
						onCompositionStart={handleCompositionStart}
						onCompositionEnd={handleCompositionEnd}
						placeholder={placeholder}
						disabled={disabled || tags.length >= maxTags}
						className={cn(
							"flex-1",
							error && "border-destructive focus-visible:ring-destructive/20",
						)}
						maxLength={maxTagLength}
						aria-invalid={!!error}
						aria-describedby={error ? errorId : undefined}
						aria-expanded={showSuggestions}
						aria-autocomplete="list"
						aria-haspopup="listbox"
						role="combobox"
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
				</div>

				{/* オートコンプリート候補 */}
				{enableAutocompletion && showSuggestions && suggestions.length > 0 && (
					<div
						ref={suggestionsRef}
						className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-md max-h-48 overflow-y-auto"
						role="listbox"
						aria-label="タグ候補"
					>
						{suggestions.map((suggestion, index) => renderSuggestion(suggestion, index))}
					</div>
				)}

				{/* ローディング表示 */}
				{enableAutocompletion && isLoading && (
					<div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-md p-3">
						<div className="flex items-center gap-2 text-sm text-muted-foreground">
							<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
							候補を検索中...
						</div>
					</div>
				)}
			</div>

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
