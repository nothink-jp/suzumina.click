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
import { Textarea } from "@suzumina.click/ui/components/ui/textarea";
import { Edit } from "lucide-react";
import { useState } from "react";

interface Video {
	videoId: string;
	title: string;
	description: string;
	tags: string[];
}

interface VideoEditDialogProps {
	video: Video;
	onUpdate: () => void;
}

export function VideoEditDialog({ video, onUpdate }: VideoEditDialogProps) {
	const [open, setOpen] = useState(false);
	const [loading, setLoading] = useState(false);
	const [formData, setFormData] = useState({
		title: video.title,
		description: video.description,
		tags: video.tags.join(", "),
	});

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);

		try {
			const response = await fetch(`/api/admin/videos/${video.videoId}`, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					...formData,
					tags: formData.tags
						.split(",")
						.map((tag) => tag.trim())
						.filter((tag) => tag),
				}),
			});

			const result = await response.json();

			if (result.success) {
				alert("動画情報を更新しました");
				setOpen(false);
				onUpdate();
			} else {
				alert(`エラー: ${result.error}`);
			}
		} catch (error) {
			alert("更新に失敗しました");
			console.error("Update error:", error);
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
					<DialogTitle>動画編集</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="videoId">動画ID</Label>
						<Input
							id="videoId"
							value={video.videoId}
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
							placeholder="動画タイトル"
							required
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="description">説明</Label>
						<Textarea
							id="description"
							value={formData.description}
							onChange={(e) => setFormData({ ...formData, description: e.target.value })}
							placeholder="動画の説明"
							rows={4}
						/>
					</div>

					<div className="space-y-2">
						<Label htmlFor="tags">タグ</Label>
						<Input
							id="tags"
							value={formData.tags}
							onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
							placeholder="タグをカンマ区切りで入力"
						/>
						<p className="text-sm text-gray-500">例: ASMR, 音声作品, リラックス</p>
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
