import type { AudioButtonQuery } from "@suzumina.click/shared-types";
import { Badge } from "@suzumina.click/ui/components/ui/badge";
import { Button } from "@suzumina.click/ui/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@suzumina.click/ui/components/ui/card";
import {
	ArrowLeft,
	Award,
	Calendar,
	Clock,
	Eye,
	Heart,
	Play,
	Tag,
	ThumbsDown,
	ThumbsUp,
	TrendingUp,
	User,
	Youtube,
} from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getAudioButtonById, getAudioButtons } from "@/app/buttons/actions";
import { getVideoById } from "@/app/videos/actions";
import VideoCard from "@/app/videos/components/VideoCard";
import { AudioButtonDeleteButton } from "@/components/audio/audio-button-delete-button";
import { AudioButtonWithPlayCount } from "@/components/audio/audio-button-with-play-count";
import { FavoriteButton } from "@/components/audio/favorite-button";
import { LikeButton } from "@/components/audio/like-button";
import { getUserByDiscordId } from "@/lib/user-firestore";

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
			includeTotalCount: false, // 関連音声ボタンでは総数は不要
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

// VideoCardWrapperコンポーネント
async function VideoCardWrapper({
	videoId,
	fallbackTitle,
}: {
	videoId: string;
	fallbackTitle?: string;
}) {
	try {
		const video = await getVideoById(videoId);

		if (!video) {
			return (
				<Card className="bg-card/80 backdrop-blur-sm shadow-lg border-0">
					<CardContent className="p-6">
						<div className="space-y-4">
							{/* サムネイル部分 */}
							<div className="aspect-video bg-muted rounded-lg overflow-hidden">
								<Image
									src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
									alt={fallbackTitle || "YouTube動画"}
									className="w-full h-full object-cover"
									width={480}
									height={360}
									unoptimized
								/>
							</div>

							{/* 動画情報 */}
							<div className="space-y-2">
								{fallbackTitle && (
									<h3 className="font-medium text-sm text-foreground line-clamp-2">
										{fallbackTitle}
									</h3>
								)}
								<p className="text-xs text-muted-foreground">涼花みなせ</p>
							</div>

							{/* アクションボタン */}
							<div className="flex gap-2">
								<Button variant="outline" size="sm" asChild className="flex-1">
									<a
										href={`https://www.youtube.com/watch?v=${videoId}`}
										target="_blank"
										rel="noopener noreferrer"
									>
										<Youtube className="h-4 w-4 mr-1" />
										YouTube
									</a>
								</Button>
								<Button variant="outline" size="sm" asChild className="flex-1">
									<Link href={`/videos/${videoId}`}>詳細</Link>
								</Button>
							</div>
						</div>
					</CardContent>
				</Card>
			);
		}

		return <VideoCard video={video} variant="sidebar" priority={false} />;
	} catch (_error) {
		// エラー時もフォールバック表示を試行
		return (
			<Card className="bg-card/80 backdrop-blur-sm shadow-lg border-0">
				<CardContent className="p-6">
					<div className="space-y-4">
						{/* サムネイル部分 */}
						<div className="aspect-video bg-muted rounded-lg overflow-hidden">
							<Image
								src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
								alt={fallbackTitle || "YouTube動画"}
								className="w-full h-full object-cover"
								width={480}
								height={360}
								unoptimized
							/>
						</div>

						{/* エラー情報 */}
						<div className="space-y-2">
							{fallbackTitle && (
								<h3 className="font-medium text-sm text-foreground line-clamp-2">
									{fallbackTitle}
								</h3>
							)}
							<p className="text-xs text-muted-foreground">涼花みなせ</p>
							<p className="text-xs text-amber-600">※ 動画情報の取得に失敗しました</p>
						</div>

						{/* アクションボタン */}
						<div className="flex gap-2">
							<Button variant="outline" size="sm" asChild className="flex-1">
								<a
									href={`https://www.youtube.com/watch?v=${videoId}`}
									target="_blank"
									rel="noopener noreferrer"
								>
									<Youtube className="h-4 w-4 mr-1" />
									YouTube
								</a>
							</Button>
						</div>
					</div>
				</CardContent>
			</Card>
		);
	}
}

// UserCardWrapperコンポーネント
async function UserCardWrapper({
	createdBy,
	createdByName,
}: {
	createdBy: string;
	createdByName: string;
}) {
	try {
		const user = await getUserByDiscordId(createdBy);

		if (!user) {
			return (
				<Card className="bg-card/80 backdrop-blur-sm shadow-lg border-0">
					<CardHeader className="pb-3">
						<CardTitle className="text-lg flex items-center gap-2">
							<User className="h-5 w-5 text-suzuka-600" />
							作成者
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="flex items-start gap-3">
							{/* フォールバック アバター */}
							<div className="w-12 h-12 rounded-full bg-suzuka-100 flex items-center justify-center shrink-0">
								<User className="h-6 w-6 text-suzuka-600" />
							</div>

							{/* ユーザー情報 */}
							<div className="space-y-1 flex-1">
								<h3 className="font-medium text-foreground">{createdByName}</h3>
								<p className="text-xs text-muted-foreground">ボタン作成者</p>
							</div>
						</div>
					</CardContent>
				</Card>
			);
		}

		// 正常なユーザー情報表示
		return (
			<Card className="bg-card/80 backdrop-blur-sm shadow-lg border-0">
				<CardHeader className="pb-3">
					<CardTitle className="text-lg flex items-center gap-2">
						<User className="h-5 w-5 text-suzuka-600" />
						作成者
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-4">
						{/* ユーザープロフィール */}
						<div className="flex items-start gap-3">
							{/* アバター */}
							<div className="w-12 h-12 rounded-full overflow-hidden shrink-0">
								{user.avatarUrl ? (
									<Image
										src={user.avatarUrl}
										alt={user.displayName}
										className="w-full h-full object-cover"
										width={48}
										height={48}
										unoptimized
									/>
								) : (
									<div className="w-full h-full bg-suzuka-100 flex items-center justify-center">
										<User className="h-6 w-6 text-suzuka-600" />
									</div>
								)}
							</div>

							{/* ユーザー情報 */}
							<div className="space-y-1 flex-1">
								<h3 className="font-medium text-foreground">{user.displayName}</h3>
								<p className="text-xs text-muted-foreground">{user.memberSince}</p>
								{user.role && user.role !== "member" && (
									<Badge variant="secondary" className="text-xs">
										{user.role === "admin"
											? "管理者"
											: user.role === "moderator"
												? "モデレーター"
												: user.role}
									</Badge>
								)}
							</div>
						</div>

						{/* 統計情報 */}
						{user.showStatistics && (
							<div className="grid grid-cols-2 gap-3">
								<div className="text-center p-2 bg-suzuka-50 rounded-lg">
									<div className="flex items-center justify-center mb-1">
										<Award className="h-3 w-3 text-suzuka-600" />
									</div>
									<div className="text-sm font-bold text-suzuka-700">
										{user.audioButtonsCount?.toLocaleString() || 0}
									</div>
									<div className="text-xs text-suzuka-600">ボタン</div>
								</div>
								<div className="text-center p-2 bg-minase-50 rounded-lg">
									<div className="flex items-center justify-center mb-1">
										<TrendingUp className="h-3 w-3 text-minase-600" />
									</div>
									<div className="text-sm font-bold text-minase-700">
										{user.totalPlayCount?.toLocaleString() || 0}
									</div>
									<div className="text-xs text-minase-600">再生数</div>
								</div>
							</div>
						)}

						{/* プロフィールボタン */}
						<Button variant="outline" size="sm" asChild className="w-full">
							<Link href={`/users/${user.discordId}`}>プロフィールを見る</Link>
						</Button>
					</div>
				</CardContent>
			</Card>
		);
	} catch (_error) {
		// エラー時もフォールバック表示
		return (
			<Card className="bg-card/80 backdrop-blur-sm shadow-lg border-0">
				<CardHeader className="pb-3">
					<CardTitle className="text-lg flex items-center gap-2">
						<User className="h-5 w-5 text-suzuka-600" />
						作成者
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="flex items-start gap-3">
						<div className="w-12 h-12 rounded-full bg-suzuka-100 flex items-center justify-center shrink-0">
							<User className="h-6 w-6 text-suzuka-600" />
						</div>
						<div className="space-y-1 flex-1">
							<h3 className="font-medium text-foreground">{createdByName}</h3>
							<p className="text-xs text-muted-foreground">ボタン作成者</p>
							<p className="text-xs text-amber-600">※ ユーザー情報の取得に失敗しました</p>
						</div>
					</div>
				</CardContent>
			</Card>
		);
	}
}

// 動的metadata生成
export async function generateMetadata({ params }: AudioButtonDetailPageProps): Promise<Metadata> {
	const resolvedParams = await params;

	let result: Awaited<ReturnType<typeof getAudioButtonById>>;
	try {
		result = await getAudioButtonById(resolvedParams.id);
	} catch (_error) {
		return {
			title: "音声ボタンが見つかりません",
			description: "指定された音声ボタンは存在しないか、削除された可能性があります。",
		};
	}

	if (!result.success) {
		return {
			title: "音声ボタンが見つかりません",
			description: "指定された音声ボタンは存在しないか、削除された可能性があります。",
		};
	}

	const audioButton = result.data;
	const duration = audioButton.endTime - audioButton.startTime;
	const description =
		audioButton.description ||
		`涼花みなせさんの音声ボタン「${audioButton.title}」。${duration}秒の音声をお楽しみください。${audioButton.createdByName}さんが作成しました。`;

	return {
		title: `${audioButton.title}`,
		description: description,
		keywords: [
			"涼花みなせ",
			"音声ボタン",
			audioButton.title,
			...(audioButton.tags || []),
			"YouTube",
			"音声切り抜き",
		],
		openGraph: {
			title: `${audioButton.title} | すずみなくりっく！`,
			description: description,
			type: "article",
			url: `https://suzumina.click/buttons/${audioButton.id}`,
			images: [
				{
					url: `https://img.youtube.com/vi/${audioButton.sourceVideoId}/maxresdefault.jpg`,
					width: 1280,
					height: 720,
					alt: `${audioButton.title} - 涼花みなせ音声ボタン`,
				},
			],
			publishedTime: audioButton.createdAt,
			authors: [audioButton.createdByName],
		},
		twitter: {
			card: "summary_large_image",
			title: `${audioButton.title} | すずみなくりっく！`,
			description: description,
			images: [`https://img.youtube.com/vi/${audioButton.sourceVideoId}/maxresdefault.jpg`],
		},
		alternates: {
			canonical: `/buttons/${audioButton.id}`,
		},
	};
}

export default async function AudioButtonDetailPage({ params }: AudioButtonDetailPageProps) {
	const resolvedParams = await params;

	let result: Awaited<ReturnType<typeof getAudioButtonById>>;
	try {
		result = await getAudioButtonById(resolvedParams.id);
	} catch (_error) {
		notFound();
	}

	if (!result.success) {
		notFound();
	}

	const audioButton = result.data;

	return (
		<div className="min-h-screen bg-gradient-to-br from-suzuka-50 via-background to-minase-50">
			{/* パンくずナビゲーション */}
			<div className="container mx-auto px-4 py-4">
				<nav aria-label="パンくずリスト" className="text-sm mb-2">
					<ol className="flex items-center space-x-2 text-muted-foreground min-w-0">
						<li className="shrink-0">
							<Link href="/" className="hover:text-foreground transition-colors">
								ホーム
							</Link>
						</li>
						<li className="shrink-0">
							<span className="mx-1">/</span>
						</li>
						<li className="shrink-0">
							<Link href="/buttons" className="hover:text-foreground transition-colors">
								音声ボタン一覧
							</Link>
						</li>
						<li className="shrink-0">
							<span className="mx-1">/</span>
						</li>
						<li className="text-foreground font-medium truncate min-w-0 max-w-[200px] sm:max-w-[300px] md:max-w-[400px] lg:max-w-[500px]">
							{audioButton.title}
						</li>
					</ol>
				</nav>
				<Button variant="ghost" size="sm" asChild>
					<Link href="/buttons" className="flex items-center gap-2 hover:text-suzuka-600">
						<ArrowLeft className="h-4 w-4" />
						音声ボタン一覧に戻る
					</Link>
				</Button>
			</div>

			<div className="container mx-auto px-4 pb-8 max-w-7xl">
				{/* メインコンテンツ: グリッドレイアウト */}
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
					{/* 左側: 音声ボタン詳細 */}
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
										<div className="text-xs text-suzuka-600">再生回数</div>
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
										<div className="flex items-center justify-center mb-1">
											<ThumbsUp className="h-4 w-4 text-amber-600" />
										</div>
										<div className="text-lg font-bold text-amber-700">
											{audioButton.likeCount.toLocaleString()}
										</div>
										<div className="text-xs text-amber-600">高評価</div>
									</div>
								</div>

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

								{/* タグ */}
								{audioButton.tags && audioButton.tags.length > 0 && (
									<div className="mb-6">
										<div className="flex items-center gap-2 flex-wrap">
											{audioButton.tags.map((tag) => (
												<Badge
													key={tag}
													variant="outline"
													className="bg-background/80 text-suzuka-700 border-suzuka-300 hover:bg-suzuka-50 transition-colors"
												>
													<Tag className="h-3 w-3 mr-1" />
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

								{/* アクションボタン */}
								<div className="mb-6">
									<div className="flex gap-2 flex-wrap">
										{/* お気に入りボタン */}
										<FavoriteButton
											audioButtonId={audioButton.id}
											isFavorited={false} // TODO: 実際のお気に入り状態を取得
											favoriteCount={audioButton.favoriteCount}
											showCount={false}
											size="sm"
											className="flex items-center gap-1"
										/>

										{/* 高評価・低評価ボタングループ */}
										<div className="flex rounded-md border border-input">
											{/* 高評価ボタン */}
											<LikeButton
												audioButtonId={audioButton.id}
												initialLikeCount={audioButton.likeCount}
												variant="outline"
												size="sm"
												className="flex items-center gap-1 border-0 rounded-l-md rounded-r-none border-r border-input"
											/>

											{/* 低評価ボタン */}
											<Button
												variant="outline"
												size="sm"
												className="flex items-center gap-1 border-0 rounded-r-md rounded-l-none"
											>
												<ThumbsDown className="h-4 w-4" />
											</Button>
										</div>
									</div>
								</div>

								{/* YouTube動画情報 */}
								<div className="bg-gradient-to-r from-suzuka-50 to-minase-50 p-6 rounded-lg border border-suzuka-100">
									<h3 className="font-medium text-sm text-muted-foreground mb-3 flex items-center gap-2">
										<Youtube className="h-4 w-4" />
										切り抜き範囲
									</h3>
									<div className="space-y-3">
										<p className="text-sm text-muted-foreground">
											再生時間: {formatTime(audioButton.startTime)} -{" "}
											{formatTime(audioButton.endTime)} (切り抜き時間:{" "}
											{audioButton.endTime - audioButton.startTime}秒)
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

					{/* 右側: 動画カード + ユーザーカード */}
					<div className="lg:col-span-1">
						<div className="space-y-6">
							{/* 動画カード */}
							<Suspense
								fallback={
									<Card className="bg-card/80 backdrop-blur-sm shadow-lg border-0">
										<CardContent className="p-6">
											<div className="flex items-center justify-center py-8">
												<Eye className="h-8 w-8 animate-pulse text-muted-foreground" />
											</div>
										</CardContent>
									</Card>
								}
							>
								<VideoCardWrapper
									videoId={audioButton.sourceVideoId}
									fallbackTitle={audioButton.sourceVideoTitle}
								/>
							</Suspense>

							{/* ユーザーカード */}
							<Suspense
								fallback={
									<Card className="bg-card/80 backdrop-blur-sm shadow-lg border-0">
										<CardHeader className="pb-3">
											<CardTitle className="text-lg flex items-center gap-2">
												<User className="h-5 w-5 text-suzuka-600" />
												作成者
											</CardTitle>
										</CardHeader>
										<CardContent>
											<div className="flex items-center justify-center py-4">
												<Eye className="h-6 w-6 animate-pulse text-muted-foreground" />
											</div>
										</CardContent>
									</Card>
								}
							>
								<UserCardWrapper
									createdBy={audioButton.createdBy}
									createdByName={audioButton.createdByName}
								/>
							</Suspense>
						</div>
					</div>
				</div>

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
