"use client";

import { Button } from "@suzumina.click/ui/components/ui/button";
import { Loader2, Plus, Sparkles } from "lucide-react";
import { useCallback, useState } from "react";
import { generateAudioButtonSuggestions } from "@/actions/audio-button-suggestions";
import type { AudioButtonSuggestion } from "@/lib/gemini/suggestion-core";

interface MetaSuggestionPanelProps {
	videoId: string;
	startTime: number;
	endTime: number;
	/** 作成処理中はフォーム全体と同様に操作不可にする */
	disabled?: boolean;
	currentTags: string[];
	onSelectTitle: (title: string) => void;
	onAddTag: (tag: string) => void;
}

/**
 * 選択区間から buttonText・タグ候補を生成して提示するパネル（SPR-148 Phase 1）。
 * 候補はクリックで入力欄へ反映する提案であって自動上書きはしない。
 * 生成失敗時も手入力フローには影響しない（graceful degradation）。
 */
export function MetaSuggestionPanel({
	videoId,
	startTime,
	endTime,
	disabled = false,
	currentTags,
	onSelectTitle,
	onAddTag,
}: MetaSuggestionPanelProps) {
	const [isGenerating, setIsGenerating] = useState(false);
	const [suggestion, setSuggestion] = useState<AudioButtonSuggestion | null>(null);
	const [error, setError] = useState("");

	const handleGenerate = useCallback(async () => {
		setIsGenerating(true);
		setError("");
		try {
			const result = await generateAudioButtonSuggestions({ videoId, startTime, endTime });
			if (result.success) {
				setSuggestion(result.data);
			} else {
				setError(result.error);
			}
		} catch (_error) {
			setError("候補の生成に失敗しました");
		} finally {
			setIsGenerating(false);
		}
	}, [videoId, startTime, endTime]);

	return (
		<div className="bg-card border rounded-lg p-4 lg:p-6 shadow-sm">
			<div className="flex items-center justify-between gap-2 mb-2">
				<h3 className="text-lg font-semibold flex items-center gap-2">
					<Sparkles className="h-4 w-4 text-primary" />
					AI候補
				</h3>
				<Button
					size="sm"
					variant="outline"
					onClick={handleGenerate}
					disabled={disabled || isGenerating}
					className="whitespace-nowrap"
				>
					{isGenerating ? (
						<>
							<Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
							生成中...
						</>
					) : suggestion ? (
						"再生成"
					) : (
						"選択区間から生成"
					)}
				</Button>
			</div>
			<p className="text-xs text-muted-foreground mb-3">
				選択中の区間の発話からタイトル・タグ候補を生成します（10秒ほどかかります）
			</p>

			{error && <p className="text-sm text-destructive mb-2">{error}</p>}

			{suggestion && (
				<div className="space-y-3">
					{suggestion.transcript && (
						<p className="text-xs text-muted-foreground border-l-2 pl-2">
							聞き取り: {suggestion.transcript}
						</p>
					)}
					<div className="space-y-1.5">
						<p className="text-sm font-medium">タイトル候補（クリックで入力）</p>
						<div className="flex flex-wrap gap-2">
							{suggestion.titles.map((title) => (
								<Button
									key={title}
									size="sm"
									variant="secondary"
									onClick={() => onSelectTitle(title)}
									disabled={disabled}
									className="max-w-full"
								>
									<span className="truncate">{title}</span>
								</Button>
							))}
						</div>
					</div>
					{suggestion.tags.length > 0 && (
						<div className="space-y-1.5">
							<p className="text-sm font-medium">タグ候補</p>
							<div className="flex flex-wrap gap-2">
								{suggestion.tags.map((tag) => (
									<Button
										key={tag}
										size="sm"
										variant="ghost"
										onClick={() => onAddTag(tag)}
										disabled={disabled || currentTags.includes(tag)}
										className="border border-dashed"
									>
										<Plus className="h-3 w-3 mr-1" />
										{tag}
									</Button>
								))}
							</div>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
