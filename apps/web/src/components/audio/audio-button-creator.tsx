"use client";

import type { CreateAudioButtonInput } from "@suzumina.click/shared-types";
import { YouTubePlayer } from "@suzumina.click/ui/components/custom/youtube-player";
import { Button } from "@suzumina.click/ui/components/ui/button";
import { Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCallback } from "react";
import { createAudioButton } from "@/app/buttons/actions";
import { useAudioButtonEditor } from "@/hooks/use-audio-button-editor";
import { BasicInfoPanel } from "./basic-info-panel";
import { CreateButtonLimit } from "./create-button-limit";
import { TimeControlPanel } from "./time-control-panel";
import { UsageGuide } from "./usage-guide";

interface AudioButtonCreatorProps {
	videoId: string;
	videoTitle: string;
	videoDuration?: number;
	initialStartTime?: number;
}

export function AudioButtonCreator({
	videoId,
	videoTitle,
	videoDuration = 600,
	initialStartTime = 0,
}: AudioButtonCreatorProps) {
	const router = useRouter();
	const { data: session } = useSession();

	// 共通の音声ボタン編集ロジック
	const editor = useAudioButtonEditor({
		videoId,
		videoTitle,
		videoDuration,
		initialStartTime,
	});

	const { state, setState, youtubeManager, timeAdjustment, timeHandlers, validation } = editor;
	const { title, description, tags, isProcessing: isCreating, error } = state;
	const { setTitle, setDescription, setTags, setIsProcessing: setIsCreating, setError } = setState;
	const isValid = validation.isValid;

	// 作成処理
	const handleCreate = useCallback(async () => {
		if (!isValid) return;

		setIsCreating(true);
		setError("");

		try {
			const input: CreateAudioButtonInput = {
				videoId: videoId,
				videoTitle: videoTitle,
				buttonText: title.trim(),
				tags,
				startTime: timeAdjustment.startTime,
				endTime: timeAdjustment.endTime,
				createdBy: {
					id: "", // This will be filled by the server
					name: "", // This will be filled by the server
				},
				isPublic: true,
			};

			const result = await createAudioButton(input);

			if (result.success) {
				router.push(`/buttons/${result.data.id}`);
			} else {
				setError(result.error || "作成に失敗しました");
			}
		} catch (_error) {
			setError("予期しないエラーが発生しました");
		} finally {
			setIsCreating(false);
		}
	}, [
		isValid,
		videoId,
		title,
		tags,
		timeAdjustment.startTime,
		timeAdjustment.endTime,
		router,
		setIsCreating,
		setError,
		videoTitle,
	]);

	// 時間調整用のハンドラーは共通フックから取得

	return (
		<div className="min-h-screen bg-background">
			<div className="container mx-auto px-4 py-6">
				<div className="mb-6">
					<div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
						<div>
							<h1 className="text-2xl font-bold mb-2">音声ボタンを作成</h1>
							<p className="text-muted-foreground text-sm">動画: {videoTitle}</p>
						</div>
						{session?.user?.discordId && (
							<div className="sm:min-w-[280px]">
								<CreateButtonLimit userId={session.user.discordId} />
							</div>
						)}
					</div>
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
									startTime={initialStartTime}
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
									isCreating={isCreating}
								/>
							</div>

							<BasicInfoPanel
								title={title}
								description={description}
								tags={tags}
								onTitleChange={setTitle}
								onDescriptionChange={setDescription}
								onTagsChange={setTags}
								disabled={isCreating}
							/>
						</div>

						<div className="col-span-full flex flex-col gap-4 mt-6 pt-6 border-t">
							<div className="flex flex-col sm:flex-row gap-3 w-full lg:justify-end">
								<Button
									variant="outline"
									onClick={() => router.back()}
									disabled={isCreating}
									className="w-full sm:w-auto min-h-[44px] order-2 sm:order-1"
								>
									キャンセル
								</Button>
								<Button
									onClick={handleCreate}
									disabled={!isValid || isCreating}
									className="w-full sm:w-auto min-h-[44px] h-11 sm:h-12 px-6 sm:px-8 order-1 sm:order-2"
									size="lg"
								>
									{isCreating ? (
										<>
											<Loader2 className="h-4 w-4 mr-2 animate-spin" />
											作成中...
										</>
									) : (
										<>
											<Plus className="h-4 w-4 mr-2" />
											音声ボタンを作成
										</>
									)}
								</Button>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
