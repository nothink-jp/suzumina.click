"use client";

import { Button } from "@suzumina.click/ui/components/ui/button";
import { ExternalLink } from "lucide-react";
import { DeleteDialog } from "./DeleteDialog";
import { EditDialog } from "./EditDialog";

interface WorkData {
	id: string;
	workId: string;
	title: string;
	description: string;
	price: number;
	tags: string[];
	isOnSale: boolean;
}

interface WorkActionsCellProps {
	work: WorkData;
}

export function WorkActionsCell({ work }: WorkActionsCellProps) {
	const handleEdit = async (data: Record<string, unknown>) => {
		try {
			// タグを配列に変換
			const processedData = {
				...data,
				tags:
					typeof data.tags === "string"
						? data.tags
								.split(",")
								.map((tag) => tag.trim())
								.filter(Boolean)
						: data.tags,
			};

			const response = await fetch(`/api/admin/works/${work.workId}`, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(processedData),
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
			const response = await fetch(`/api/admin/works/${work.workId}`, {
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
			value: work.title,
		},
		{
			key: "description",
			label: "説明",
			type: "textarea" as const,
			value: work.description,
		},
		{
			key: "price",
			label: "価格",
			type: "number" as const,
			value: work.price,
		},
		{
			key: "tags",
			label: "タグ",
			type: "text" as const,
			value: work.tags.join(", "),
		},
		{
			key: "isOnSale",
			label: "販売状態",
			type: "select" as const,
			value: work.isOnSale ? "true" : "false",
			options: [
				{ value: "true", label: "販売中" },
				{ value: "false", label: "販売終了" },
			],
		},
	];

	return (
		<div className="flex gap-1 justify-end">
			<Button variant="outline" size="sm" asChild>
				<a
					href={`https://www.dlsite.com/maniax/work/=/product_id/${work.workId}.html`}
					target="_blank"
					rel="noopener noreferrer"
					className="gap-1"
				>
					<ExternalLink className="h-3 w-3" />
					DLsite
				</a>
			</Button>

			<EditDialog
				title="作品情報編集"
				description="作品の情報を編集します。"
				fields={editFields}
				onSave={handleEdit}
			/>

			<DeleteDialog
				title="作品削除"
				description="この作品を削除しますか？"
				warningText="削除すると元に戻すことはできません。"
				onDelete={handleDelete}
			/>
		</div>
	);
}
