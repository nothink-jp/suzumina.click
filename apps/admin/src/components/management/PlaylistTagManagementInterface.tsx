"use client";

import { Badge } from "@suzumina.click/ui/components/ui/badge";
import { Button } from "@suzumina.click/ui/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@suzumina.click/ui/components/ui/card";
import { Checkbox } from "@suzumina.click/ui/components/ui/checkbox";
import { Input } from "@suzumina.click/ui/components/ui/input";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@suzumina.click/ui/components/ui/table";
import { Check, Eye, EyeOff, Play, Save, Settings } from "lucide-react";
import { useCallback, useState, useTransition } from "react";
import {
	bulkUpdatePlaylistTagVisibility,
	type PlaylistTagManagement,
	updatePlaylistTagVisibility,
} from "@/app/actions/video-actions";

interface PlaylistTagManagementInterfaceProps {
	tags: PlaylistTagManagement[];
}

export function PlaylistTagManagementInterface({
	tags: initialTags,
}: PlaylistTagManagementInterfaceProps) {
	const [tags, setTags] = useState(initialTags);
	const [editingTag, setEditingTag] = useState<string | null>(null);
	const [editingDescription, setEditingDescription] = useState("");
	const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
	const [isPending, startTransition] = useTransition();

	// 個別のタグ設定更新
	const handleToggleVisibility = useCallback((tag: string, isVisible: boolean) => {
		startTransition(async () => {
			const result = await updatePlaylistTagVisibility(tag, isVisible);
			if (result.success) {
				setTags((prev) => prev.map((t) => (t.tag === tag ? { ...t, isVisible } : t)));
			}
		});
	}, []);

	// 説明の編集開始
	const handleEditDescription = useCallback((tag: string, currentDescription: string) => {
		setEditingTag(tag);
		setEditingDescription(currentDescription);
	}, []);

	// 説明の保存
	const handleSaveDescription = useCallback(
		(tag: string) => {
			startTransition(async () => {
				const tagData = tags.find((t) => t.tag === tag);
				if (!tagData) return;

				const result = await updatePlaylistTagVisibility(
					tag,
					tagData.isVisible,
					editingDescription,
				);
				if (result.success) {
					setTags((prev) =>
						prev.map((t) => (t.tag === tag ? { ...t, description: editingDescription } : t)),
					);
					setEditingTag(null);
					setEditingDescription("");
				}
			});
		},
		[tags, editingDescription],
	);

	// 説明の編集キャンセル
	const handleCancelEdit = useCallback(() => {
		setEditingTag(null);
		setEditingDescription("");
	}, []);

	// 選択されたタグの切り替え
	const handleSelectTag = useCallback((tag: string, isSelected: boolean) => {
		setSelectedTags((prev) => {
			const newSet = new Set(prev);
			if (isSelected) {
				newSet.add(tag);
			} else {
				newSet.delete(tag);
			}
			return newSet;
		});
	}, []);

	// 全選択/全解除
	const handleSelectAll = useCallback(
		(isSelected: boolean) => {
			if (isSelected) {
				setSelectedTags(new Set(tags.map((t) => t.tag)));
			} else {
				setSelectedTags(new Set());
			}
		},
		[tags],
	);

	// 選択されたタグの一括操作
	const handleBulkVisibility = useCallback(
		(isVisible: boolean) => {
			if (selectedTags.size === 0) return;

			startTransition(async () => {
				const updates = Array.from(selectedTags).map((tag) => {
					const tagData = tags.find((t) => t.tag === tag);
					return {
						tag,
						isVisible,
						description: tagData?.description || "",
					};
				});

				const result = await bulkUpdatePlaylistTagVisibility(updates);
				if (result.success) {
					setTags((prev) => prev.map((t) => (selectedTags.has(t.tag) ? { ...t, isVisible } : t)));
					setSelectedTags(new Set());
				}
			});
		},
		[selectedTags, tags],
	);

	const visibleCount = tags.filter((t) => t.isVisible).length;
	const hiddenCount = tags.length - visibleCount;

	return (
		<div className="space-y-6">
			{/* 概要統計 */}
			<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium flex items-center gap-2">
							<Play className="h-4 w-4" />
							総プレイリストタグ
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{tags.length}</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium flex items-center gap-2">
							<Eye className="h-4 w-4" />
							表示中
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-green-600">{visibleCount}</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium flex items-center gap-2">
							<EyeOff className="h-4 w-4" />
							非表示
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-red-600">{hiddenCount}</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium flex items-center gap-2">
							<Check className="h-4 w-4" />
							選択中
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-blue-600">{selectedTags.size}</div>
					</CardContent>
				</Card>
			</div>

			{/* 一括操作 */}
			{selectedTags.size > 0 && (
				<Card className="border-blue-200 bg-blue-50">
					<CardHeader>
						<CardTitle className="text-sm flex items-center gap-2">
							<Settings className="h-4 w-4" />
							一括操作 ({selectedTags.size}件選択中)
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="flex gap-2">
							<Button
								size="sm"
								variant="outline"
								onClick={() => handleBulkVisibility(true)}
								disabled={isPending}
							>
								<Eye className="h-4 w-4 mr-1" />
								一括表示
							</Button>
							<Button
								size="sm"
								variant="outline"
								onClick={() => handleBulkVisibility(false)}
								disabled={isPending}
							>
								<EyeOff className="h-4 w-4 mr-1" />
								一括非表示
							</Button>
							<Button size="sm" variant="outline" onClick={() => setSelectedTags(new Set())}>
								選択解除
							</Button>
						</div>
					</CardContent>
				</Card>
			)}

			{/* プレイリストタグ管理テーブル */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Play className="h-5 w-5" />
						プレイリストタグ管理
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="rounded-md border">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead className="w-12">
										<Checkbox
											checked={selectedTags.size === tags.length && tags.length > 0}
											onCheckedChange={handleSelectAll}
										/>
									</TableHead>
									<TableHead>プレイリストタグ</TableHead>
									<TableHead className="text-center">動画数</TableHead>
									<TableHead className="text-center">表示状態</TableHead>
									<TableHead>説明</TableHead>
									<TableHead className="text-right">操作</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{tags.map((tag) => (
									<TableRow key={tag.tag}>
										<TableCell>
											<Checkbox
												checked={selectedTags.has(tag.tag)}
												onCheckedChange={(checked) => handleSelectTag(tag.tag, checked === true)}
											/>
										</TableCell>
										<TableCell className="font-medium">
											<div className="flex items-center gap-2">
												<Badge variant="outline" className="bg-blue-50">
													{tag.tag}
												</Badge>
											</div>
										</TableCell>
										<TableCell className="text-center">
											<Badge variant="secondary">{tag.videoCount}</Badge>
										</TableCell>
										<TableCell className="text-center">
											<Button
												size="sm"
												variant="ghost"
												onClick={() => handleToggleVisibility(tag.tag, !tag.isVisible)}
												disabled={isPending}
											>
												{tag.isVisible ? (
													<>
														<Eye className="h-4 w-4 text-green-600" />
														<span className="sr-only">表示中</span>
													</>
												) : (
													<>
														<EyeOff className="h-4 w-4 text-red-600" />
														<span className="sr-only">非表示</span>
													</>
												)}
											</Button>
										</TableCell>
										<TableCell>
											{editingTag === tag.tag ? (
												<div className="flex gap-2">
													<Input
														value={editingDescription}
														onChange={(e) => setEditingDescription(e.target.value)}
														placeholder="説明を入力..."
														className="text-sm"
													/>
													<Button
														size="sm"
														onClick={() => handleSaveDescription(tag.tag)}
														disabled={isPending}
													>
														<Save className="h-4 w-4" />
													</Button>
													<Button size="sm" variant="outline" onClick={handleCancelEdit}>
														キャンセル
													</Button>
												</div>
											) : (
												<button
													type="button"
													className="text-sm text-muted-foreground cursor-pointer hover:text-foreground bg-transparent border-none p-0 text-left w-full"
													onClick={() => handleEditDescription(tag.tag, tag.description || "")}
												>
													{tag.description || "説明を追加..."}
												</button>
											)}
										</TableCell>
										<TableCell className="text-right">
											<div className="flex gap-1 justify-end">
												<Button
													size="sm"
													variant="ghost"
													onClick={() => handleEditDescription(tag.tag, tag.description || "")}
												>
													<Settings className="h-4 w-4" />
												</Button>
											</div>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>

					{tags.length === 0 && (
						<div className="text-center py-8 text-muted-foreground">
							プレイリストタグがありません
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
