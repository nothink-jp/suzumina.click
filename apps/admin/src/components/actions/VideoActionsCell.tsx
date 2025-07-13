"use client";

import { Button } from "@suzumina.click/ui/components/ui/button";
import { ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { deleteVideo, updateVideo } from "@/app/actions/video-actions";
import { ConfirmDialog } from "../common/confirm-dialog";
import { FormDialog } from "../common/form-dialog";

interface VideoData {
	id: string;
	videoId: string;
	title: string;
	description: string;
	tags: string[];
}

interface VideoActionsCellProps {
	video: VideoData;
}

export function VideoActionsCell({ video }: VideoActionsCellProps) {
	const handleEdit = async (data: Record<string, unknown>) => {
		const result = await updateVideo(video.videoId, {
			title: data.title as string,
			description: data.description as string,
			tags: data.tags as string[],
		});

		if (result.success) {
			toast.success(result.message);
			return true;
		}
		toast.error(result.message);
		return false;
	};

	const handleDelete = async () => {
		const result = await deleteVideo(video.videoId);

		if (result.success) {
			toast.success(result.message);
			return true;
		}
		toast.error(result.message);
		return false;
	};

	const editFields = [
		{
			key: "title",
			label: "タイトル",
			type: "text" as const,
			value: video.title,
		},
		{
			key: "description",
			label: "説明",
			type: "textarea" as const,
			value: video.description,
		},
		{
			key: "tags",
			label: "タグ",
			type: "text" as const,
			value: video.tags.join(", "),
		},
	];

	return (
		<div className="flex gap-1 justify-end">
			<Button variant="outline" size="sm" asChild>
				<a
					href={`https://www.youtube.com/watch?v=${video.videoId}`}
					target="_blank"
					rel="noopener noreferrer"
					className="gap-1"
				>
					<ExternalLink className="h-3 w-3" />
					YouTube
				</a>
			</Button>

			<FormDialog
				title="動画情報編集"
				description="動画の情報を編集します。"
				fields={editFields}
				onSave={handleEdit}
			/>

			<ConfirmDialog
				title="動画削除"
				description="この動画を削除しますか？"
				warningText="関連する音声ボタンがある場合は削除できません。"
				onConfirm={handleDelete}
			/>
		</div>
	);
}
