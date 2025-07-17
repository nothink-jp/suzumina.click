/**
 * タグ入力コンポーネント
 * VIDEO_TAGS_DESIGN.md Phase 2準拠
 */

"use client";

import { Badge } from "@suzumina.click/ui/components/ui/badge";
import { Button } from "@suzumina.click/ui/components/ui/button";
import { Input } from "@suzumina.click/ui/components/ui/input";
import { cn } from "@suzumina.click/ui/lib/utils";
import { Plus, X } from "lucide-react";
import type * as React from "react";
import { useState } from "react";

export interface TagInputProps {
	/** 現在のタグ配列 */
	tags: string[];
	/** タグ変更時のコールバック */
	onTagsChange: (tags: string[]) => void;
	/** 最大タグ数 (デフォルト: 15) */
	maxTags?: number;
	/** 各タグの最大文字数 (デフォルト: 30) */
	maxTagLength?: number;
	/** プレースホルダーテキスト */
	placeholder?: string;
	/** 入力無効状態 */
	disabled?: boolean;
	/** 追加のクラス名 */
	className?: string;
}

export function TagInput({
	tags,
	onTagsChange,
	maxTags = 15,
	maxTagLength = 30,
	placeholder = "タグを入力...",
	disabled = false,
	className,
}: TagInputProps) {
	const [inputValue, setInputValue] = useState("");
	const [error, setError] = useState<string | null>(null);

	/**
	 * タグを追加する
	 */
	const addTag = () => {
		const trimmedValue = inputValue.trim();

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
	};

	/**
	 * タグを削除する
	 */
	const removeTag = (indexToRemove: number) => {
		onTagsChange(tags.filter((_, index) => index !== indexToRemove));
		setError(null);
	};

	/**
	 * Enter キー押下時の処理
	 */
	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter") {
			e.preventDefault();
			addTag();
		}
	};

	/**
	 * 入力値変更時の処理
	 */
	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setInputValue(e.target.value);
		if (error) {
			setError(null);
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
			<div className="flex gap-2">
				<Input
					type="text"
					value={inputValue}
					onChange={handleInputChange}
					onKeyDown={handleKeyDown}
					placeholder={placeholder}
					disabled={disabled || tags.length >= maxTags}
					className={cn("flex-1", error && "border-destructive focus-visible:ring-destructive/20")}
					maxLength={maxTagLength}
					aria-invalid={!!error}
					aria-describedby={error ? "tag-input-error" : undefined}
				/>
				<Button
					type="button"
					variant="outline"
					size="sm"
					onClick={addTag}
					disabled={disabled || !inputValue.trim() || tags.length >= maxTags}
					aria-label="タグを追加"
				>
					<Plus className="h-4 w-4" />
				</Button>
			</div>

			{/* エラーメッセージ */}
			{error && (
				<p id="tag-input-error" className="text-sm text-destructive">
					{error}
				</p>
			)}

			{/* 制限情報 */}
			<div className="text-xs text-muted-foreground">
				{tags.length}/{maxTags} タグ (各タグ最大{maxTagLength}文字)
			</div>
		</div>
	);
}
