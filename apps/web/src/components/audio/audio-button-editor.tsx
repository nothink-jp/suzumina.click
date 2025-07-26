"use client";

import type { FrontendAudioButtonData, UpdateAudioButtonInput } from "@suzumina.click/shared-types";
import { YouTubePlayer } from "@suzumina.click/ui/components/custom/youtube-player";
import { Button } from "@suzumina.click/ui/components/ui/button";
import { Loader2, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { updateAudioButton } from "@/app/buttons/actions";
import { useAudioButtonEditor } from "@/hooks/use-audio-button-editor";
import { BasicInfoPanel } from "./basic-info-panel";
import { TimeControlPanel } from "./time-control-panel";
import { UsageGuide } from "./usage-guide";

interface AudioButtonEditorProps {
	audioButton: FrontendAudioButtonData;
	videoDuration?: number;
}

export function AudioButtonEditor({ audioButton, videoDuration = 600 }: AudioButtonEditorProps) {
	const router = useRouter();

	// 共通の音声ボタン編集ロジック（編集モード）
	const editor = useAudioButtonEditor({
		videoId: audioButton.sourceVideoId,
		videoTitle: audioButton.sourceVideoTitle,
		videoDuration,
		audioButton,
	});

	const { state, setState, youtubeManager, timeAdjustment, timeHandlers, validation, hasChanges } =
		editor;
	const { title, description, tags, isProcessing: isUpdating, error } = state;
	const { setTitle, setDescription, setTags, setIsProcessing: setIsUpdating, setError } = setState;
	const isValid = validation.isValid;

	// 更新処理
	const handleUpdate = useCallback(async () => {
		if (!isValid || !hasChanges) return;

		setIsUpdating(true);
		setError("");

		try {
			const input: UpdateAudioButtonInput = {
				id: audioButton.id,
				title: title.trim(),
				description: description.trim() || undefined,
				tags,
			};

			const result = await updateAudioButton(input);

			if (result.success) {
				router.push(`/buttons/${audioButton.id}`);
			} else {
				setError(result.error || "更新に失敗しました");
			}
		} catch (_error) {
			setError("予期しないエラーが発生しました");
		} finally {
			setIsUpdating(false);
		}
	}, [
		isValid,
		hasChanges,
		audioButton.id,
		title,
		description,
		tags,
		router,
		setError,
		setIsUpdating,
	]);

	// 時間調整用のハンドラーは共通フックから取得

	return (
		<div className="min-h-screen bg-background">
			<div className="container mx-auto px-4 py-6">
				<div className="mb-6">
					<h1 className="text-2xl font-bold mb-2">音声ボタンを編集</h1>
					<p className="text-muted-foreground text-sm">動画: {audioButton.sourceVideoTitle}</p>
				</div>

				{error && (
					<div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
						<p className="text-sm text-destructive">{error}</p>
					</div>
				)}

				<div className="max-w-7xl mx-auto">
					<div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
						<div className="lg:col-span-1 xl:col-span-2">
							<div className="aspect-video bg-muted rounded-lg overflow-hidden shadow-lg">
								<YouTubePlayer
									videoId={youtubeManager.videoId}
									onReady={(player) => {
										youtubeManager.youtubePlayerRef.current = player;
										youtubeManager.onPlayerReady();
									}}
									onStateChange={youtubeManager.onPlayerStateChange}
									startTime={audioButton.startTime}
									controls={true}
								/>
							</div>

							<UsageGuide />
						</div>

						<div className="lg:col-span-1 xl:col-span-1 space-y-4">
							<div className="bg-card border rounded-lg p-4 lg:p-6 shadow-sm">
								<div className="mb-4">
									<h3 className="text-lg font-semibold">音声操作</h3>
								</div>

								<TimeControlPanel
									startTime={timeAdjustment.startTime}
									endTime={timeAdjustment.endTime}
									currentTime={youtubeManager.currentTime}
									startTimeInput={timeAdjustment.startTimeInput}
									endTimeInput={timeAdjustment.endTimeInput}
									isEditingStartTime={timeAdjustment.isEditingStartTime}
									isEditingEndTime={timeAdjustment.isEditingEndTime}
									isAdjusting={timeAdjustment.isAdjusting}
									{...timeHandlers}
									isCreating={isUpdating}
								/>
							</div>

							<BasicInfoPanel
								title={title}
								description={description}
								tags={tags}
								onTitleChange={setTitle}
								onDescriptionChange={setDescription}
								onTagsChange={setTags}
								disabled={isUpdating}
							/>
						</div>

						<div className="col-span-full flex flex-col gap-4 mt-6 pt-6 border-t">
							<div className="flex flex-col sm:flex-row gap-3 w-full lg:justify-end">
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
		</div>
	);
}
