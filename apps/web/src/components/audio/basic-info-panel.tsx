"use client";

import { Input } from "@suzumina.click/ui/components/ui/input";
import { type ReactNode, useId } from "react";
import { AudioButtonTagEditor } from "./audio-button-tag-editor";

interface BasicInfoPanelProps {
	title: string;
	tags: string[];
	onTitleChange: (title: string) => void;
	onTagsChange: (tags: string[]) => void;
	disabled?: boolean;
	/** タイトル入力の直下に埋め込む AI候補ブロック（作成画面のみ・SPR-290） */
	metaSuggestion?: ReactNode;
}

/**
 * 基本情報の入力群（SPR-290 でカード分割）。
 * タイトル（+AI候補）・タグの2カード構成。
 */
export function BasicInfoPanel({
	title,
	tags,
	onTitleChange,
	onTagsChange,
	disabled = false,
	metaSuggestion,
}: BasicInfoPanelProps) {
	const titleId = useId();

	return (
		<div className="space-y-4">
			{/* タイトル */}
			<div className="bg-card border rounded-lg p-4 shadow-sm space-y-2">
				<label htmlFor={titleId} className="text-sm sm:text-base font-medium">
					ボタンタイトル <span className="text-destructive">*</span>
				</label>
				<Input
					id={titleId}
					value={title || ""}
					onChange={(e) => onTitleChange(e.target.value)}
					placeholder="例: おはようございます"
					maxLength={100}
					disabled={disabled}
					className="text-base min-h-[44px]"
				/>
				<p className="text-xs sm:text-sm text-muted-foreground">{(title || "").length}/100</p>
				{metaSuggestion}
			</div>

			{/* タグ */}
			<div className="bg-card border rounded-lg p-4 shadow-sm">
				<AudioButtonTagEditor tags={tags || []} onTagsChange={onTagsChange} disabled={disabled} />
			</div>
		</div>
	);
}
