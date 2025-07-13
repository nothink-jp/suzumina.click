"use client";

import { Button } from "@suzumina.click/ui/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@suzumina.click/ui/components/ui/dialog";
import { Input } from "@suzumina.click/ui/components/ui/input";
import { Label } from "@suzumina.click/ui/components/ui/label";
import { Switch } from "@suzumina.click/ui/components/ui/switch";
import { Textarea } from "@suzumina.click/ui/components/ui/textarea";
import { Edit } from "lucide-react";
import { useState } from "react";

interface Work {
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

interface WorkEditDialogProps {
	work: Work;
	onUpdate: () => void;
}

export function WorkEditDialog({ work, onUpdate }: WorkEditDialogProps) {
	const [open, setOpen] = useState(false);
	const [loading, setLoading] = useState(false);
	const [formData, setFormData] = useState({
		title: work.title,
		description: work.description,
		price: work.price.current.toString(),
		tags: work.tags.join(", "),
		isOnSale: work.isOnSale,
	});

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);

		try {
			const response = await fetch(`/api/admin/works/${work.workId}`, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					...formData,
					price: {
						...work.price,
						current: Number(formData.price),
					},
					tags: formData.tags
						.split(",")
						.map((tag) => tag.trim())
						.filter((tag) => tag),
				}),
			});

			const result = await response.json();

			if (result.success) {
				alert("作品情報を更新しました");
				setOpen(false);
				onUpdate();
			} else {
				alert(`エラー: ${result.error}`);
			}
		} catch (_error) {
			alert("更新に失敗しました");
		} finally {
			setLoading(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button variant="outline" size="sm">
					<Edit className="h-4 w-4 mr-1" />
					編集
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-[525px]">
				<DialogHeader>
					<DialogTitle>作品編集</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="workId">作品ID</Label>
						<Input
							id="workId"
							value={work.workId}
							disabled
							className="bg-gray-50 font-mono text-sm"
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="title">タイトル</Label>
						<Input
							id="title"
							value={formData.title}
							onChange={(e) => setFormData({ ...formData, title: e.target.value })}
							placeholder="作品タイトル"
							required
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="description">説明</Label>
						<Textarea
							id="description"
							value={formData.description}
							onChange={(e) => setFormData({ ...formData, description: e.target.value })}
							placeholder="作品の説明"
							rows={4}
						/>
					</div>

					<div className="grid grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor="price">価格 (円)</Label>
							<Input
								id="price"
								type="number"
								value={formData.price}
								onChange={(e) => setFormData({ ...formData, price: e.target.value })}
								placeholder="価格"
								min="0"
								required
							/>
						</div>

						<div className="flex items-center space-x-2 pt-6">
							<Switch
								id="isOnSale"
								checked={formData.isOnSale}
								onCheckedChange={(checked) => setFormData({ ...formData, isOnSale: checked })}
							/>
							<Label htmlFor="isOnSale">販売中</Label>
						</div>
					</div>

					<div className="space-y-2">
						<Label htmlFor="tags">タグ</Label>
						<Input
							id="tags"
							value={formData.tags}
							onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
							placeholder="タグをカンマ区切りで入力"
						/>
						<p className="text-sm text-gray-500">例: ASMR, 音声作品, ヒーリング</p>
					</div>

					<div className="flex justify-end space-x-2 pt-4">
						<Button
							type="button"
							variant="outline"
							onClick={() => setOpen(false)}
							disabled={loading}
						>
							キャンセル
						</Button>
						<Button type="submit" disabled={loading}>
							{loading ? "更新中..." : "更新"}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}
