"use client";

import {
	type AudioButtonPlainObject,
	formatTimestamp,
	type UpdateAudioButtonInput,
} from "@suzumina.click/shared-types";
import { PlayHero } from "@suzumina.click/ui/components/custom/play-hero";
import { Button } from "@suzumina.click/ui/components/ui/button";
import { Loader2, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { updateAudioButton } from "@/app/buttons/actions";
import { validateTags, validateTitle } from "@/hooks/use-audio-button-validation";
import { BasicInfoPanel } from "./basic-info-panel";

interface AudioButtonEditorProps {
	audioButton: AudioButtonPlainObject;
}

/**
 * 音声ボタンの編集画面。編集できるのはタイトルとタグだけ。
 * 切り抜き範囲は作成後に変更できない（いいね・お気に入りは「その音」に付くため。正本は UpdateAudioButtonInput）。
 * 範囲は確認用に表示し、試聴しても再生数には数えない（PlayHero に onPlay を渡さない）。
 * 再生ボタンの見出しは入力中のタイトルで「保存後の見た目」を示す（空欄のあいだは保存済みのタイトル）
 */
export function AudioButtonEditor({ audioButton }: AudioButtonEditorProps) {
	const router = useRouter();
	const [buttonText, setButtonText] = useState(audioButton.buttonText);
	const [tags, setTags] = useState<string[]>(audioButton.tags || []);
	const [isUpdating, setIsUpdating] = useState(false);
	const [error, setError] = useState("");

	const isValid = validateTitle(buttonText) === null && validateTags(tags) === null;
	const hasChanges =
		buttonText !== audioButton.buttonText ||
		JSON.stringify(tags) !== JSON.stringify(audioButton.tags || []);
	const duration = audioButton.endTime - audioButton.startTime;
	const preview = { ...audioButton, buttonText: buttonText.trim() || audioButton.buttonText };

	const handleUpdate = async () => {
		if (!isValid || !hasChanges) return;

		setIsUpdating(true);
		setError("");

		try {
			const input: UpdateAudioButtonInput = {
				buttonText: buttonText.trim(),
				tags,
			};

			const result = await updateAudioButton(audioButton.id, input);

			if (result.success) {
				// フルロード遷移（SPR-252）: router.push だと /buttons ツリー内の soft nav が
				// @modal にインターセプトされ、編集フォームの上にクイックビューが重なる
				window.location.href = `/buttons/${audioButton.id}`;
			} else {
				setError(result.error || "更新に失敗しました");
			}
		} catch (_error) {
			setError("予期しないエラーが発生しました");
		} finally {
			setIsUpdating(false);
		}
	};

	return (
		<div className="min-h-screen bg-background">
			<div className="container mx-auto px-4 py-6">
				<div className="max-w-2xl mx-auto">
					<div className="mb-6">
						<h1 className="text-2xl font-bold mb-2">音声ボタンを編集</h1>
						<p className="text-muted-foreground text-sm">動画: {audioButton.videoTitle}</p>
					</div>

					{error && (
						<div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
							<p className="text-sm text-destructive">{error}</p>
						</div>
					)}

					<div className="space-y-4">
						<div className="bg-card border rounded-lg p-4 shadow-sm text-center">
							<PlayHero audioButton={preview} size="M" />
							<p className="mt-3 text-sm text-muted-foreground">
								切り抜き範囲 {formatTimestamp(audioButton.startTime)} 〜{" "}
								{formatTimestamp(audioButton.endTime)}（{duration.toFixed(1)}秒）
							</p>
							<p className="mt-1 text-xs text-muted-foreground">
								切り抜き範囲は作成後に変更できません
							</p>
						</div>

						<BasicInfoPanel
							title={buttonText}
							tags={tags}
							onTitleChange={setButtonText}
							onTagsChange={setTags}
							disabled={isUpdating}
						/>
					</div>

					<div className="flex flex-col gap-4 mt-6 pt-6 border-t">
						<div className="flex flex-col sm:flex-row gap-3 w-full sm:justify-end">
							<Button
								variant="outline"
								onClick={() => router.back()}
								disabled={isUpdating}
								className="w-full sm:w-auto min-h-[44px] order-2 sm:order-1"
							>
								キャンセル
							</Button>
							<Button
								onClick={handleUpdate}
								disabled={!isValid || !hasChanges || isUpdating}
								className="w-full sm:w-auto min-h-[44px] h-11 sm:h-12 px-6 sm:px-8 order-1 sm:order-2"
								size="lg"
							>
								{isUpdating ? (
									<>
										<Loader2 className="h-4 w-4 mr-2 animate-spin" />
										更新中...
									</>
								) : (
									<>
										<Save className="h-4 w-4 mr-2" />
										変更を保存
									</>
								)}
							</Button>
						</div>
						{!hasChanges && (
							<p className="text-sm text-muted-foreground text-center">変更がありません</p>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
