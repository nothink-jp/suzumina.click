/**
 * ユーザータグ編集コンポーネント
 * VIDEO_TAGS_DESIGN.md Phase 2準拠
 */

"use client";

import { Badge } from "@suzumina.click/ui/components/ui/badge";
import { Button } from "@suzumina.click/ui/components/ui/button";
import { cn } from "@suzumina.click/ui/lib/utils";
import { Edit, Save, X } from "lucide-react";
import { useState } from "react";
import { TagInput } from "./tag-input";

export interface UserTagEditorProps {
	/** 動画ID */
	videoId: string;
	/** 現在のユーザータグ */
	userTags: string[];
	/** プレイリストタグ (読み取り専用) */
	playlistTags?: string[];
	/** カテゴリID (読み取り専用) */
	categoryId?: string;
	/** 編集権限の有無 */
	canEdit: boolean;
	/** タグ更新時のコールバック */
	onUpdateTags?: (videoId: string, tags: string[]) => Promise<{ success: boolean; error?: string }>;
	/** 追加のクラス名 */
	className?: string;
}

export function UserTagEditor({
	videoId,
	userTags,
	playlistTags = [],
	categoryId,
	canEdit,
	onUpdateTags,
	className,
}: UserTagEditorProps) {
	const [isEditing, setIsEditing] = useState(false);
	const [editingTags, setEditingTags] = useState<string[]>(userTags);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	/**
	 * 編集開始
	 */
	const startEditing = () => {
		setEditingTags(userTags);
		setIsEditing(true);
		setError(null);
	};

	/**
	 * 編集キャンセル
	 */
	const cancelEditing = () => {
		setEditingTags(userTags);
		setIsEditing(false);
		setError(null);
	};

	/**
	 * タグ保存
	 */
	const saveTags = async () => {
		if (!onUpdateTags) {
			setError("更新機能が利用できません");
			return;
		}

		setIsLoading(true);
		setError(null);

		try {
			const result = await onUpdateTags(videoId, editingTags);

			if (result.success) {
				setIsEditing(false);
			} else {
				setError(result.error || "タグの更新に失敗しました");
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : "タグの更新に失敗しました");
		} finally {
			setIsLoading(false);
		}
	};

	/**
	 * カテゴリIDを日本語ラベルに変換
	 */
	const getCategoryLabel = (id?: string): string => {
		if (!id) return "";

		const categoryMap: Record<string, string> = {
			"1": "映画・アニメ",
			"2": "自動車・乗り物",
			"10": "音楽",
			"15": "ペット・動物",
			"17": "スポーツ",
			"19": "旅行・イベント",
			"20": "ゲーム",
			"22": "ブログ・人物",
			"23": "コメディー",
			"24": "エンターテインメント",
			"25": "ニュース・政治",
			"26": "ハウツー・スタイル",
			"27": "教育",
			"28": "科学技術",
		};

		return categoryMap[id] || `カテゴリ${id}`;
	};

	return (
		<div className={cn("space-y-4", className)}>
			{/* 3層タグシステム表示 */}
			<div className="space-y-3">
				{/* プレイリストタグ */}
				{playlistTags.length > 0 && (
					<div>
						<h4 className="text-sm font-medium text-muted-foreground mb-2">プレイリストタグ</h4>
						<div className="flex flex-wrap gap-2">
							{playlistTags.map((tag, index) => (
								<Badge key={index} variant="default" className="bg-blue-600">
									{tag}
								</Badge>
							))}
						</div>
					</div>
				)}

				{/* カテゴリIDタグ */}
				{categoryId && (
					<div>
						<h4 className="text-sm font-medium text-muted-foreground mb-2">カテゴリ</h4>
						<Badge variant="secondary" className="bg-green-600 text-white">
							{getCategoryLabel(categoryId)}
						</Badge>
					</div>
				)}

				{/* ユーザータグ */}
				<div>
					<div className="flex items-center justify-between mb-2">
						<h4 className="text-sm font-medium text-muted-foreground">ユーザータグ</h4>
						{canEdit && !isEditing && (
							<Button variant="ghost" size="sm" onClick={startEditing} className="h-6 px-2 text-xs">
								<Edit className="h-3 w-3 mr-1" />
								編集
							</Button>
						)}
					</div>

					{/* 編集モード */}
					{isEditing ? (
						<div className="space-y-3">
							<TagInput
								tags={editingTags}
								onTagsChange={setEditingTags}
								maxTags={15}
								maxTagLength={30}
								placeholder="ユーザータグを入力..."
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
						/* 表示モード */
						<div>
							{userTags.length > 0 ? (
								<div className="flex flex-wrap gap-2">
									{userTags.map((tag, index) => (
										<Badge key={index} variant="outline" className="bg-purple-50 border-purple-200">
											{tag}
										</Badge>
									))}
								</div>
							) : (
								<p className="text-sm text-muted-foreground">
									{canEdit
										? "タグを追加するには「編集」をクリックしてください"
										: "ユーザータグはありません"}
								</p>
							)}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
