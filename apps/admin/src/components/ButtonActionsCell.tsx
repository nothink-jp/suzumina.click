"use client";

import { Button } from "@suzumina.click/ui/components/ui/button";
import { ExternalLink } from "lucide-react";
import { DeleteDialog } from "./DeleteDialog";
import { EditDialog } from "./EditDialog";

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
		try {
			const response = await fetch(`/api/admin/buttons/${button.id}`, {
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
			const response = await fetch(`/api/admin/buttons/${button.id}`, {
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

			<EditDialog
				title="音声ボタン編集"
				description="音声ボタンの情報を編集します。"
				fields={editFields}
				onSave={handleEdit}
			/>

			<DeleteDialog
				title="音声ボタン削除"
				description="この音声ボタンを削除しますか？"
				warningText="関連するお気に入りも一緒に削除されます。削除すると元に戻すことはできません。"
				onDelete={handleDelete}
			/>
		</div>
	);
}
