/**
 * 音声ボタンタグ編集コンポーネント
 * 音声ボタン作成・編集時のタグ管理
 */

"use client";

import { TagInput } from "@suzumina.click/ui/components/custom/tag-input";
import { cn } from "@suzumina.click/ui/lib/utils";
import { Tag } from "lucide-react";

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
}

export function AudioButtonTagEditor({
	tags,
	onTagsChange,
	maxTags = 10,
	maxTagLength = 30,
	disabled = false,
	className,
}: AudioButtonTagEditorProps) {
	return (
		<div className={cn("space-y-2", className)}>
			<label
				htmlFor="tag-input"
				className="text-sm sm:text-base font-medium flex items-center gap-2"
			>
				<Tag className="h-4 w-4" />
				タグ（任意）
			</label>

			<TagInput
				tags={tags}
				onTagsChange={onTagsChange}
				maxTags={maxTags}
				maxTagLength={maxTagLength}
				placeholder="タグを入力してEnter"
				disabled={disabled}
			/>
		</div>
	);
}
