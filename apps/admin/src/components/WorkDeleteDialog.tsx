"use client";

import { Button } from "@suzumina.click/ui/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@suzumina.click/ui/components/ui/dialog";
import { Trash2 } from "lucide-react";
import { useState } from "react";

interface Work {
	workId: string;
	title: string;
}

interface WorkDeleteDialogProps {
	work: Work;
	onDelete: () => void;
}

export function WorkDeleteDialog({ work, onDelete }: WorkDeleteDialogProps) {
	const [open, setOpen] = useState(false);
	const [loading, setLoading] = useState(false);

	const handleDelete = async () => {
		setLoading(true);

		try {
			const response = await fetch(`/api/admin/works/${work.workId}`, {
				method: "DELETE",
			});

			const result = await response.json();

			if (result.success) {
				alert("作品を削除しました");
				setOpen(false);
				onDelete();
			} else {
				alert(`エラー: ${result.error}`);
			}
		} catch (_error) {
			alert("削除に失敗しました");
		} finally {
			setLoading(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button variant="outline" size="sm">
					<Trash2 className="h-4 w-4 mr-1" />
					削除
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>作品削除確認</DialogTitle>
				</DialogHeader>
				<div className="space-y-4">
					<p className="text-sm text-gray-600">以下の作品を削除しますか？</p>
					<div className="bg-gray-50 p-3 rounded-md">
						<p className="font-medium">{work.title}</p>
						<p className="text-sm text-gray-600 font-mono">{work.workId}</p>
					</div>
					<p className="text-sm text-red-600">※ この操作は元に戻せません。</p>
					<div className="flex justify-end space-x-2 pt-4">
						<Button
							type="button"
							variant="outline"
							onClick={() => setOpen(false)}
							disabled={loading}
						>
							キャンセル
						</Button>
						<Button variant="destructive" onClick={handleDelete} disabled={loading}>
							{loading ? "削除中..." : "削除"}
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
