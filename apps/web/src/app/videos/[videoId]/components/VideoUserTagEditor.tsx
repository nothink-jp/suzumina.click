/**
 * 動画詳細ページ用ユーザータグ編集コンポーネント
 * VIDEO_TAGS_DESIGN.md Phase 2準拠
 */

"use client";

import type { FrontendVideoData } from "@suzumina.click/shared-types/src/video";
import { ThreeLayerTagDisplay } from "@suzumina.click/ui/components/custom/three-layer-tag-display";
import { UserTagEditor } from "@suzumina.click/ui/components/custom/user-tag-editor";
import { Button } from "@suzumina.click/ui/components/ui/button";
import { getYouTubeCategoryName } from "@suzumina.click/ui/lib/youtube-category-utils";
import { Edit } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useCallback, useState } from "react";
import { updateUserTagsAction } from "@/actions/user-tags";

interface VideoUserTagEditorProps {
	video: FrontendVideoData;
}

export function VideoUserTagEditor({ video }: VideoUserTagEditorProps) {
	const { data: session } = useSession();
	const router = useRouter();
	const [isEditingUserTags, setIsEditingUserTags] = useState(false);

	/**
	 * ユーザータグ更新処理
	 */
	const handleUpdateTags = useCallback(
		async (videoId: string, tags: string[]) => {
			try {
				const result = await updateUserTagsAction({
					videoId,
					userTags: tags,
				});

				if (result.success) {
					// 成功時はページをリフレッシュして最新データを取得
					router.refresh();
					setIsEditingUserTags(false);
					return { success: true };
				}
				return {
					success: false,
					error: result.error || "タグの更新に失敗しました",
				};
			} catch (error) {
				return {
					success: false,
					error: error instanceof Error ? error.message : "タグの更新に失敗しました",
				};
			}
		},
		[router],
	);

	// 編集権限チェック: 認証済みユーザーのみ編集可能
	const canEdit = !!session?.user?.discordId;

	// カテゴリ名取得
	const categoryName = getYouTubeCategoryName(video.categoryId);

	// タグクリック時の検索ページ遷移
	const handleTagClick = useCallback(
		(tag: string, layer: "playlist" | "user" | "category") => {
			const params = new URLSearchParams();
			params.set("q", tag);
			params.set("type", "videos");

			// 層に応じたフィルターパラメータを設定
			switch (layer) {
				case "playlist":
					params.set("playlistTags", tag);
					break;
				case "user":
					params.set("userTags", tag);
					break;
				case "category":
					params.set("categoryNames", tag);
					break;
			}

			router.push(`/search?${params.toString()}`);
		},
		[router],
	);

	return (
		<div className="space-y-6">
			{/* 3層タグ表示 */}
			<ThreeLayerTagDisplay
				playlistTags={video.playlistTags || []}
				userTags={video.userTags || []}
				categoryId={video.categoryId}
				categoryName={categoryName || undefined}
				size="default"
				maxTagsPerLayer={10}
				showEmptyLayers={true}
				showCategory={true}
				onTagClick={handleTagClick}
			/>

			{/* ユーザータグ編集セクション */}
			{canEdit && (
				<div className="border-t pt-6">
					<div className="flex items-center justify-between mb-4">
						<h4 className="text-lg font-semibold">ユーザータグ編集</h4>
						{!isEditingUserTags && (
							<Button variant="outline" size="sm" onClick={() => setIsEditingUserTags(true)}>
								<Edit className="h-4 w-4 mr-2" />
								編集
							</Button>
						)}
					</div>

					{isEditingUserTags ? (
						<UserTagEditor
							videoId={video.videoId}
							userTags={video.userTags || []}
							playlistTags={video.playlistTags || []}
							categoryId={video.categoryId}
							canEdit={canEdit}
							onUpdateTags={handleUpdateTags}
						/>
					) : (
						<p className="text-sm text-muted-foreground">
							「編集」ボタンをクリックしてユーザータグを編集できます。
						</p>
					)}
				</div>
			)}

			{!canEdit && (
				<div className="border-t pt-6">
					<p className="text-sm text-muted-foreground">
						ユーザータグを編集するには、すずみなふぁみりーメンバーとしてログインしてください。
					</p>
				</div>
			)}
		</div>
	);
}
