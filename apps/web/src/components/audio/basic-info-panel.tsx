"use client";

import { Input } from "@suzumina.click/ui/components/ui/input";
import { Textarea } from "@suzumina.click/ui/components/ui/textarea";
import { Plus } from "lucide-react";
import { type ReactNode, useId, useState } from "react";
import { AudioButtonTagEditor } from "./audio-button-tag-editor";

interface BasicInfoPanelProps {
	title: string;
	description: string;
	tags: string[];
	onTitleChange: (title: string) => void;
	onDescriptionChange: (description: string) => void;
	onTagsChange: (tags: string[]) => void;
	disabled?: boolean;
	/** タイトル入力の直下に埋め込む AI候補ブロック（作成画面のみ・SPR-290） */
	metaSuggestion?: ReactNode;
}

/**
 * 基本情報の入力群（SPR-290 でカード分割）。
 * タイトル（+AI候補）・タグ・説明の3カード構成。説明は使用頻度が低いため
 * 折りたたみで畳んでおき、初期値があるとき（編集画面）は開いた状態で始める。
 */
export function BasicInfoPanel({
	title,
	description,
	tags,
	onTitleChange,
	onDescriptionChange,
	onTagsChange,
	disabled = false,
	metaSuggestion,
}: BasicInfoPanelProps) {
	const titleId = useId();
	const descriptionId = useId();
	// 一度開いたら閉じない（畳み直す動機がなく、閉じると入力済みの値が見えなくなるため）。
	// 初期値があるとき（編集画面）は開いた状態で始める
	const [isDescriptionOpen, setIsDescriptionOpen] = useState(() => (description || "").length > 0);

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

			{/* 説明: 折りたたみ（任意項目のため既定は畳む） */}
			<div className="bg-card border rounded-lg shadow-sm">
				{isDescriptionOpen ? (
					<div className="p-4 space-y-2">
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
				) : (
					<button
						type="button"
						onClick={() => setIsDescriptionOpen(true)}
						disabled={disabled}
						className="flex min-h-[44px] w-full items-center justify-between px-4 py-3 text-sm text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
					>
						説明を追加（任意）
						<Plus className="h-4 w-4" />
					</button>
				)}
			</div>
		</div>
	);
}
