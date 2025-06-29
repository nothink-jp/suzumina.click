"use client";

import { Button } from "@suzumina.click/ui/components/ui/button";
import { ExternalLink } from "lucide-react";
import { DeleteDialog } from "./DeleteDialog";
import { EditDialog } from "./EditDialog";

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
		try {
			const response = await fetch(`/api/admin/videos/${video.videoId}`, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(data),
			});

			const result = await response.json();
			if (result.success) {
				alert(result.message);
				return true;
			}
			alert(`エラー: ${result.error}`);
			return false;
		} catch (_error) {
			alert("更新に失敗しました");
			return false;
		}
	};

	const handleDelete = async () => {
		try {
			const response = await fetch(`/api/admin/videos/${video.videoId}`, {
				method: "DELETE",
			});

			const result = await response.json();
			if (result.success) {
				alert(result.message);
				return true;
			}
			alert(`エラー: ${result.error}`);
			return false;
		} catch (_error) {
			alert("削除に失敗しました");
			return false;
		}
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

			<EditDialog
				title="動画情報編集"
				description="動画の情報を編集します。"
				fields={editFields}
				onSave={handleEdit}
			/>

			<DeleteDialog
				title="動画削除"
				description="この動画を削除しますか？"
				warningText="関連する音声ボタンがある場合は削除できません。"
				onDelete={handleDelete}
			/>
		</div>
	);
}
