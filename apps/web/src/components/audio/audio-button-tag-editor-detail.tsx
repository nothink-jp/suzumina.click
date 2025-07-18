/**
 * 音声ボタン詳細ページ用タグ編集コンポーネント
 * 認証ユーザーのみタグ編集が可能
 */

"use client";

import { TagInput } from "@suzumina.click/ui/components/custom/tag-input";
import { Button } from "@suzumina.click/ui/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@suzumina.click/ui/components/ui/card";
import { cn } from "@suzumina.click/ui/lib/utils";
import { Edit, Save, Tag, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { updateAudioButtonTags } from "@/app/buttons/actions";

export interface AudioButtonTagEditorDetailProps {
	/** 音声ボタンID */
	audioButtonId: string;
	/** 現在のタグ配列 */
	tags: string[];
	/** 作成者のDiscord ID */
	createdBy: string;
	/** 現在のユーザーのDiscord ID */
	currentUserId?: string;
	/** 現在のユーザーの権限 */
	currentUserRole?: string;
	/** 追加のクラス名 */
	className?: string;
}

export function AudioButtonTagEditorDetail({
	audioButtonId,
	tags,
	createdBy,
	currentUserId,
	currentUserRole,
	className,
}: AudioButtonTagEditorDetailProps) {
	const router = useRouter();
	const [isEditing, setIsEditing] = useState(false);
	const [editingTags, setEditingTags] = useState<string[]>(tags);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// 編集権限チェック
	const canEdit = currentUserId && (currentUserId === createdBy || currentUserRole === "admin");

	/**
	 * 編集開始
	 */
	const startEditing = useCallback(() => {
		setEditingTags(tags);
		setIsEditing(true);
		setError(null);
	}, [tags]);

	/**
	 * 編集キャンセル
	 */
	const cancelEditing = useCallback(() => {
		setEditingTags(tags);
		setIsEditing(false);
		setError(null);
	}, [tags]);

	/**
	 * タグ保存
	 */
	const saveTags = useCallback(async () => {
		setIsLoading(true);
		setError(null);

		try {
			const result = await updateAudioButtonTags(audioButtonId, editingTags);

			if (result.success) {
				setIsEditing(false);
				// ページをリフレッシュして最新データを取得
				router.refresh();
			} else {
				setError(result.error || "タグの更新に失敗しました");
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : "タグの更新に失敗しました");
		} finally {
			setIsLoading(false);
		}
	}, [audioButtonId, editingTags, router]);

	return (
		<Card className={cn("bg-card/80 backdrop-blur-sm shadow-lg border-0", className)}>
			<CardHeader className="pb-3">
				<CardTitle className="text-lg flex items-center justify-between">
					<div className="flex items-center gap-2">
						<Tag className="h-5 w-5 text-suzuka-600" />
						タグ
					</div>
					{canEdit && !isEditing && (
						<Button variant="ghost" size="sm" onClick={startEditing} className="h-8 px-3 text-xs">
							<Edit className="h-3 w-3 mr-1" />
							編集
						</Button>
					)}
				</CardTitle>
			</CardHeader>
			<CardContent>
				{isEditing ? (
					<div className="space-y-4">
						<TagInput
							tags={editingTags}
							onTagsChange={setEditingTags}
							maxTags={10}
							maxTagLength={30}
							placeholder="タグを入力..."
							disabled={isLoading}
						/>

						{/* 編集ボタン */}
						<div className="flex gap-2">
							<Button
								variant="default"
								size="sm"
								onClick={saveTags}
								disabled={isLoading}
								className="h-8"
							>
								<Save className="h-3 w-3 mr-1" />
								{isLoading ? "保存中..." : "保存"}
							</Button>
							<Button
								variant="outline"
								size="sm"
								onClick={cancelEditing}
								disabled={isLoading}
								className="h-8"
							>
								<X className="h-3 w-3 mr-1" />
								キャンセル
							</Button>
						</div>

						{/* エラー表示 */}
						{error && <p className="text-sm text-destructive">{error}</p>}
					</div>
				) : (
					<div>
						{tags.length > 0 ? (
							<div className="space-y-2">
								{/* 既存のTagListを使用せず、編集可能性を示すため独自実装 */}
								<div className="flex flex-wrap gap-2">
									{tags.map((tag) => (
										<span
											key={tag}
											className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground border"
										>
											{tag}
										</span>
									))}
								</div>
								{canEdit && (
									<p className="text-xs text-muted-foreground">
										「編集」をクリックしてタグを変更できます
									</p>
								)}
							</div>
						) : (
							<div className="text-center py-4">
								<p className="text-sm text-muted-foreground mb-2">
									{canEdit
										? "タグを追加して音声ボタンを見つけやすくしましょう"
										: "タグはまだ設定されていません"}
								</p>
								{canEdit && (
									<Button variant="outline" size="sm" onClick={startEditing} className="h-8">
										<Tag className="h-3 w-3 mr-1" />
										タグを追加
									</Button>
								)}
							</div>
						)}
					</div>
				)}

				{!canEdit && !isEditing && (
					<p className="text-xs text-muted-foreground mt-2 pt-2 border-t">
						※ タグを編集するには、ボタンの作成者としてログインする必要があります
					</p>
				)}
			</CardContent>
		</Card>
	);
}
