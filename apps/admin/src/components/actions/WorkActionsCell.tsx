"use client";

import { Button } from "@suzumina.click/ui/components/ui/button";
import { ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { deleteWork, updateWork } from "@/app/actions/work-actions";
import { ConfirmDialog } from "../common/confirm-dialog";
import { FormDialog } from "../common/form-dialog";

interface WorkData {
	id: string;
	workId: string;
	title: string;
	description: string;
	price: {
		current: number;
		currency: string;
		original?: number;
		discount?: number;
	};
	tags: string[];
	isOnSale: boolean;
}

interface WorkActionsCellProps {
	work: WorkData;
}

export function WorkActionsCell({ work }: WorkActionsCellProps) {
	const handleEdit = async (data: Record<string, unknown>) => {
		// タグを配列に変換
		const tags =
			typeof data.tags === "string"
				? data.tags
						.split(",")
						.map((tag) => tag.trim())
						.filter(Boolean)
				: (data.tags as string[]);

		const result = await updateWork(work.workId, {
			title: data.title as string,
			description: data.description as string,
			price: data.price as number,
			tags,
			isOnSale: data.isOnSale === "true",
		});

		if (result.success) {
			toast.success(result.message);
			return true;
		}
		toast.error(result.message);
		return false;
	};

	const handleDelete = async () => {
		const result = await deleteWork(work.workId);

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
			value: work.price.current,
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

			<FormDialog
				title="作品情報編集"
				description="作品の情報を編集します。"
				fields={editFields}
				onSave={handleEdit}
			/>

			<ConfirmDialog
				title="作品削除"
				description="この作品を削除しますか？"
				warningText="削除すると元に戻すことはできません。"
				onConfirm={handleDelete}
			/>
		</div>
	);
}
