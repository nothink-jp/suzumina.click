import type { FrontendAudioButtonData } from "@suzumina.click/shared-types";
import { TimeDisplay } from "@suzumina.click/ui/components/custom/time-display";
import { Button } from "@suzumina.click/ui/components/ui/button";
import { Card, CardContent } from "@suzumina.click/ui/components/ui/card";
import { Calendar, Clock, Pencil, Youtube } from "lucide-react";
import Link from "next/link";
import type { Session } from "next-auth";
import { AudioButtonDeleteButton } from "@/components/audio/audio-button-delete-button";
import { AudioButtonTagEditorDetail } from "@/components/audio/audio-button-tag-editor-detail";
import { AudioButtonWithPlayCount } from "@/components/audio/audio-button-with-play-count";
import { AudioButtonDetailActions } from "./audio-button-detail-actions";
import { AudioButtonDetailStats } from "./audio-button-detail-stats";

// 相対時間表示
function formatRelativeTime(dateString: string): string {
	const date = new Date(dateString);
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

	if (diffDays === 0) {
		const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
		if (diffHours === 0) {
			const diffMinutes = Math.floor(diffMs / (1000 * 60));
			return `${diffMinutes}分前`;
		}
		return `${diffHours}時間前`;
	}
	if (diffDays < 7) {
		return `${diffDays}日前`;
	}
	return date.toLocaleDateString("ja-JP", {
		timeZone: "Asia/Tokyo",
	});
}

interface AudioButtonDetailMainContentProps {
	audioButton: FrontendAudioButtonData;
	session: Session | null;
	isAuthenticated: boolean;
	isFavorited: boolean;
	isLiked: boolean;
	isDisliked: boolean;
}

export function AudioButtonDetailMainContent({
	audioButton,
	session,
	isAuthenticated,
	isFavorited,
	isLiked,
	isDisliked,
}: AudioButtonDetailMainContentProps) {
	return (
		<div className="lg:col-span-2">
			<Card className="bg-card/80 backdrop-blur-sm shadow-lg border-0">
				<CardContent className="p-8">
					<div className="flex items-start justify-between mb-6">
						<div className="space-y-3 flex-1">
							<h1 className="text-3xl font-bold text-foreground leading-tight">
								{audioButton.title}
							</h1>
							<div className="flex items-center gap-4 text-sm text-muted-foreground">
								<span className="flex items-center gap-1">
									<Calendar className="h-4 w-4" />
									{formatRelativeTime(audioButton.createdAt)}
								</span>
								<span className="flex items-center gap-1">
									<Clock className="h-4 w-4" />
									{(audioButton.endTime - audioButton.startTime).toFixed(1)}秒
								</span>
								<span className="text-xs text-muted-foreground">
									by {audioButton.createdByName}
								</span>
							</div>
						</div>
						{/* 編集・削除ボタン */}
						<div className="flex items-center gap-2">
							{/* 編集ボタン */}
							{session?.user &&
								(audioButton.createdBy === session.user.discordId ||
									session.user.role === "admin") && (
									<Button variant="outline" size="sm" asChild className="flex items-center gap-1">
										<Link href={`/buttons/${audioButton.id}/edit`}>
											<Pencil className="h-4 w-4" />
											編集
										</Link>
									</Button>
								)}
							{/* 削除ボタン */}
							<AudioButtonDeleteButton
								audioButtonId={audioButton.id}
								audioButtonTitle={audioButton.title}
								createdBy={audioButton.createdBy}
								variant="outline"
								size="sm"
								showLabel={true}
							/>
						</div>
					</div>

					{/* 統計情報 */}
					<AudioButtonDetailStats
						playCount={audioButton.playCount}
						favoriteCount={audioButton.favoriteCount}
						likeCount={audioButton.likeCount}
					/>

					{/* 説明文 */}
					{audioButton.description?.trim() && (
						<div className="mb-6">
							<div className="bg-gradient-to-r from-minase-50 to-suzuka-50 p-4 rounded-lg border border-minase-100">
								<p className="text-foreground leading-relaxed whitespace-pre-wrap">
									{audioButton.description}
								</p>
							</div>
						</div>
					)}

					{/* タグ編集 */}
					<div className="mb-6">
						<AudioButtonTagEditorDetail
							audioButtonId={audioButton.id}
							tags={audioButton.tags || []}
							createdBy={audioButton.createdBy}
							currentUserId={session?.user?.discordId}
							currentUserRole={session?.user?.role}
						/>
					</div>

					{/* 音声ボタン再生エリア */}
					<div className="mb-6">
						<h3 className="text-sm font-medium text-muted-foreground mb-3">音声ボタン</h3>
						<AudioButtonWithPlayCount
							audioButton={audioButton}
							showFavorite={true}
							className="border-2 border-suzuka-200 hover:border-suzuka-300"
						/>
					</div>

					{/* アクションボタン */}
					<AudioButtonDetailActions
						audioButtonId={audioButton.id}
						isFavorited={isFavorited}
						favoriteCount={audioButton.favoriteCount}
						likeCount={audioButton.likeCount}
						isLiked={isLiked}
						isDisliked={isDisliked}
						isAuthenticated={isAuthenticated}
					/>

					{/* YouTube動画情報 */}
					<div className="bg-gradient-to-r from-suzuka-50 to-minase-50 p-6 rounded-lg border border-suzuka-100">
						<h3 className="font-medium text-sm text-muted-foreground mb-3 flex items-center gap-2">
							<Youtube className="h-4 w-4" />
							切り抜き範囲
						</h3>
						<div className="space-y-3">
							<p className="text-sm text-muted-foreground">
								再生時間:{" "}
								<TimeDisplay time={audioButton.startTime} format="mm:ss.s" className="inline" /> -{" "}
								<TimeDisplay time={audioButton.endTime} format="mm:ss.s" className="inline" />{" "}
								(切り抜き時間: {(audioButton.endTime - audioButton.startTime).toFixed(1)}秒)
							</p>
							<Button variant="outline" size="sm" asChild>
								<a
									href={`https://www.youtube.com/watch?v=${audioButton.sourceVideoId}&t=${Math.floor(audioButton.startTime)}`}
									target="_blank"
									rel="noopener noreferrer"
								>
									<Youtube className="h-4 w-4 mr-2" />
									YouTubeで開く
								</a>
							</Button>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
