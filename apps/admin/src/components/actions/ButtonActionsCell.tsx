"use client";

import { Button } from "@suzumina.click/ui/components/ui/button";
import { ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { deleteAudioButton, updateAudioButton } from "@/app/actions/button-actions";
import { ConfirmDialog } from "../common/confirm-dialog";
import { FormDialog } from "../common/form-dialog";

interface AudioButton {
	id: string;
	title: string;
	youtubeVideoId: string;
	startTime: number;
	endTime: number;
	isPublic: boolean;
}

interface ButtonActionsCellProps {
	button: AudioButton;
}

export function ButtonActionsCell({ button }: ButtonActionsCellProps) {
	const handleEdit = async (data: Record<string, unknown>) => {
		const result = await updateAudioButton(button.id, {
			title: data.title as string,
			startTime: data.startTime as number,
			endTime: data.endTime as number,
			isPublic: data.isPublic === "true",
		});

		if (result.success) {
			toast.success(result.message);
			return true;
		}
		toast.error(result.message);
		return false;
	};

	const handleDelete = async () => {
		const result = await deleteAudioButton(button.id);

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
			value: button.title,
		},
		{
			key: "startTime",
			label: "開始時間(秒)",
			type: "number" as const,
			value: button.startTime,
		},
		{
			key: "endTime",
			label: "終了時間(秒)",
			type: "number" as const,
			value: button.endTime,
		},
		{
			key: "isPublic",
			label: "公開状態",
			type: "select" as const,
			value: button.isPublic ? "true" : "false",
			options: [
				{ value: "true", label: "公開" },
				{ value: "false", label: "非公開" },
			],
		},
	];

	return (
		<div className="flex gap-1 justify-end">
			<Button variant="outline" size="sm" asChild>
				<a
					href={`https://www.youtube.com/watch?v=${button.youtubeVideoId}&t=${button.startTime}s`}
					target="_blank"
					rel="noopener noreferrer"
					className="gap-1"
				>
					<ExternalLink className="h-3 w-3" />
					YouTube
				</a>
			</Button>

			<FormDialog
				title="音声ボタン編集"
				description="音声ボタンの情報を編集します。"
				fields={editFields}
				onSave={handleEdit}
			/>

			<ConfirmDialog
				title="音声ボタン削除"
				description="この音声ボタンを削除しますか？"
				warningText="関連するお気に入りも一緒に削除されます。削除すると元に戻すことはできません。"
				onConfirm={handleDelete}
			/>
		</div>
	);
}
