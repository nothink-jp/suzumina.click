"use client";

import { Input } from "@suzumina.click/ui/components/ui/input";
import { Textarea } from "@suzumina.click/ui/components/ui/textarea";
import { useId } from "react";
import { AudioButtonTagEditor } from "./audio-button-tag-editor";

interface BasicInfoPanelProps {
	title: string;
	description: string;
	tags: string[];
	onTitleChange: (title: string) => void;
	onDescriptionChange: (description: string) => void;
	onTagsChange: (tags: string[]) => void;
	disabled?: boolean;
}

export function BasicInfoPanel({
	title,
	description,
	tags,
	onTitleChange,
	onDescriptionChange,
	onTagsChange,
	disabled = false,
}: BasicInfoPanelProps) {
	const titleId = useId();
	const descriptionId = useId();

	return (
		<div className="bg-card border rounded-lg p-4 lg:p-6 shadow-sm">
			<h3 className="text-lg font-semibold mb-4">基本情報</h3>
			<div className="space-y-4">
				{/* タイトル入力 */}
				<div className="space-y-2">
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
				</div>

				{/* 説明文入力 */}
				<div className="space-y-2">
					<label htmlFor={descriptionId} className="text-sm sm:text-base font-medium">
						説明（任意）
					</label>
					<Textarea
						id={descriptionId}
						value={description || ""}
						onChange={(e) => onDescriptionChange(e.target.value)}
						placeholder="音声ボタンの詳細説明を入力（任意）"
						maxLength={500}
						disabled={disabled}
						rows={3}
						className="text-base resize-none"
					/>
					<p className="text-xs sm:text-sm text-muted-foreground">
						{(description || "").length}/500
					</p>
				</div>

				{/* タグ入力 */}
				<AudioButtonTagEditor tags={tags || []} onTagsChange={onTagsChange} disabled={disabled} />
			</div>
		</div>
	);
}
