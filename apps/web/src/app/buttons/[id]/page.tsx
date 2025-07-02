import type { AudioButtonQuery } from "@suzumina.click/shared-types";
import { YouTubePlayer } from "@suzumina.click/ui/components/custom/youtube-player";
import { Badge } from "@suzumina.click/ui/components/ui/badge";
import { Button } from "@suzumina.click/ui/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@suzumina.click/ui/components/ui/card";
import { ArrowLeft, Calendar, Clock, Eye, Heart, Play, Tag, Youtube } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getAudioButtonById, getAudioButtons } from "@/app/buttons/actions";
import { AudioButtonDeleteButton } from "@/components/AudioButtonDeleteButton";
import { AudioButtonWithPlayCount } from "@/components/AudioButtonWithPlayCount";
import { LikeButton } from "@/components/LikeButton";

interface AudioButtonDetailPageProps {
	params: Promise<{
		id: string;
	}>;
}

// 時間フォーマット関数
function formatTime(seconds: number): string {
	const minutes = Math.floor(seconds / 60);
	const remainingSeconds = seconds % 60;
	return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

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

// 関連音声ボタンコンポーネント
async function RelatedAudioButtons({
	currentId,
	videoId,
	// biome-ignore lint/correctness/noUnusedFunctionParameters: tags will be used for related audio recommendation in future
	tags,
}: {
	currentId: string;
	videoId: string;
	tags: string[];
}) {
	try {
		// 同じ動画の音声ボタンを取得
		const sameVideoQuery: AudioButtonQuery = {
			sourceVideoId: videoId,
			limit: 6,
			sortBy: "newest",
			onlyPublic: true,
		};

		const sameVideoResult = await getAudioButtons(sameVideoQuery);

		if (sameVideoResult.success) {
			const relatedButtons = sameVideoResult.data.audioButtons.filter(
				(button) => button.id !== currentId,
			);

			if (relatedButtons.length > 0) {
				return (
					<Card className="bg-card/80 backdrop-blur-sm shadow-lg border-0">
						<CardHeader>
							<CardTitle className="flex items-center gap-2 text-lg">
								<Youtube className="h-5 w-5 text-suzuka-600" />
								同じ動画の音声ボタン
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="flex flex-wrap gap-3 items-start">
								{relatedButtons.slice(0, 6).map((audioButton) => (
									<AudioButtonWithPlayCount
										key={audioButton.id}
										audioButton={audioButton}
										showFavorite={true}
										maxTitleLength={50}
										className="shadow-sm hover:shadow-md transition-all duration-200"
									/>
								))}
							</div>
							{relatedButtons.length > 6 && (
								<div className="mt-6 text-center">
									<Button
										variant="outline"
										size="sm"
										asChild
										className="border-suzuka-200 text-suzuka-600 hover:bg-suzuka-50"
									>
										<Link href={`/buttons?videoId=${videoId}`}>
											この動画の音声ボタンをもっと見る
										</Link>
									</Button>
								</div>
							)}
						</CardContent>
					</Card>
				);
			}
		}
	} catch (_error) {
		// 関連音声ボタン取得エラーは無視してページを継続表示
	}

	return null;
}

export default async function AudioButtonDetailPage({ params }: AudioButtonDetailPageProps) {
	const resolvedParams = await params;

	const result = await getAudioButtonById(resolvedParams.id);

	if (!result.success) {
		notFound();
	}

	const audioButton = result.data;

	return (
		<div className="min-h-screen bg-gradient-to-br from-suzuka-50 via-background to-minase-50">
			{/* パンくずナビゲーション */}
			<div className="container mx-auto px-4 py-4">
				<Button variant="ghost" size="sm" asChild>
					<Link href="/buttons" className="flex items-center gap-2 hover:text-suzuka-600">
						<ArrowLeft className="h-4 w-4" />
						音声ボタン一覧に戻る
					</Link>
				</Button>
			</div>

			<div className="container mx-auto px-4 pb-8 max-w-4xl">
				{/* メインカード */}
				<Card className="bg-card/80 backdrop-blur-sm shadow-lg border-0 mb-8">
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
										{audioButton.endTime - audioButton.startTime}秒
									</span>
									<span className="text-xs text-muted-foreground">
										by {audioButton.createdByName}
									</span>
								</div>
							</div>
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

						{/* 統計情報 */}
						<div className="grid grid-cols-3 gap-4 mb-6">
							<div className="text-center p-3 bg-suzuka-50 rounded-lg border border-suzuka-100">
								<div className="flex items-center justify-center mb-1">
									<Play className="h-4 w-4 text-suzuka-600" />
								</div>
								<div className="text-lg font-bold text-suzuka-700">
									{audioButton.playCount.toLocaleString()}
								</div>
								<div className="text-xs text-suzuka-600">再生</div>
							</div>
							<div className="text-center p-3 bg-rose-50 rounded-lg border border-rose-100">
								<div className="flex items-center justify-center mb-1">
									<Heart className="h-4 w-4 text-rose-600" />
								</div>
								<div className="text-lg font-bold text-rose-700">
									{audioButton.favoriteCount.toLocaleString()}
								</div>
								<div className="text-xs text-rose-600">お気に入り</div>
							</div>
							<div className="text-center p-3 bg-amber-50 rounded-lg border border-amber-100">
								<div className="flex items-center justify-center mb-2">
									<LikeButton
										audioButtonId={audioButton.id}
										initialLikeCount={audioButton.likeCount}
										variant="ghost"
										size="sm"
										className="text-amber-700 hover:text-amber-800"
									/>
								</div>
								<div className="text-xs text-amber-600">いいね</div>
							</div>
						</div>

						{/* タグ */}
						{audioButton.tags && audioButton.tags.length > 0 && (
							<div className="mb-6">
								<h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
									<Tag className="h-4 w-4" />
									タグ
								</h3>
								<div className="flex items-center gap-2 flex-wrap">
									{audioButton.tags.map((tag) => (
										<Badge
											key={tag}
											variant="secondary"
											className="bg-suzuka-100 text-suzuka-700 hover:bg-suzuka-200"
										>
											{tag}
										</Badge>
									))}
								</div>
							</div>
						)}

						{/* 音声ボタン再生エリア */}
						<div className="mb-6">
							<h3 className="text-sm font-medium text-muted-foreground mb-3">音声ボタン</h3>
							<AudioButtonWithPlayCount
								audioButton={audioButton}
								showFavorite={true}
								className="border-2 border-suzuka-200 hover:border-suzuka-300"
							/>
						</div>

						{/* YouTube動画情報 */}
						<div className="bg-gradient-to-r from-suzuka-50 to-minase-50 p-6 rounded-lg border border-suzuka-100">
							<h3 className="font-medium text-sm text-muted-foreground mb-3 flex items-center gap-2">
								<Youtube className="h-4 w-4" />
								元動画
							</h3>
							<div className="space-y-3">
								<p className="font-medium text-foreground">{audioButton.sourceVideoTitle}</p>
								<p className="text-sm text-muted-foreground">
									再生時間: {formatTime(audioButton.startTime)} - {formatTime(audioButton.endTime)}{" "}
									(切り抜き時間: {audioButton.endTime - audioButton.startTime}秒)
								</p>
								<div className="flex gap-2">
									<Button variant="outline" size="sm" asChild>
										<Link href={`/videos/${audioButton.sourceVideoId}`}>
											<Youtube className="h-4 w-4 mr-2" />
											動画詳細を見る
										</Link>
									</Button>
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
						</div>
					</CardContent>
				</Card>

				{/* YouTube Player */}
				<Card className="bg-card/80 backdrop-blur-sm shadow-lg border-0 mb-8">
					<CardHeader>
						<CardTitle className="text-lg">YouTube動画プレイヤー</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="aspect-video bg-black rounded-lg overflow-hidden">
							<YouTubePlayer
								videoId={audioButton.sourceVideoId}
								width="100%"
								height="100%"
								startTime={audioButton.startTime}
								endTime={audioButton.endTime}
								controls
								autoplay={false}
							/>
						</div>
					</CardContent>
				</Card>

				{/* 関連音声ボタン */}
				<Suspense
					fallback={
						<Card className="bg-card/80 backdrop-blur-sm shadow-lg border-0">
							<CardHeader>
								<CardTitle className="text-lg">関連音声ボタン</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="flex items-center justify-center py-8">
									<Eye className="h-8 w-8 animate-pulse text-muted-foreground" />
								</div>
							</CardContent>
						</Card>
					}
				>
					<RelatedAudioButtons
						currentId={audioButton.id}
						videoId={audioButton.sourceVideoId}
						tags={audioButton.tags || []}
					/>
				</Suspense>
			</div>
		</div>
	);
}
