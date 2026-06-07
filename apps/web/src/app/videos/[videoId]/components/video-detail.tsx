"use client";

import type { UserSession, VideoPlainObject } from "@suzumina.click/shared-types";
import { canCreateAudioButton, getVideoAllTags } from "@suzumina.click/shared-types";
import { Badge } from "@suzumina.click/ui/components/ui/badge";
import { Button } from "@suzumina.click/ui/components/ui/button";
import { Card } from "@suzumina.click/ui/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@suzumina.click/ui/components/ui/tabs";
import {
	Calendar,
	Clock,
	ExternalLink,
	Eye,
	PlayCircle,
	Plus,
	Radio,
	Timer,
	Video,
} from "lucide-react";
import Link from "next/link";
import React, { type ReactNode, useMemo } from "react";
import { ThumbnailImage } from "@/components/ui";
import { useSession } from "@/lib/auth/client";
import { formatDescriptionText } from "@/lib/text-utils";
import { VideoUserTagEditor } from "./video-user-tag-editor";

interface VideoDetailProps {
	video: VideoPlainObject;
	initialTotalAudioCount?: number;
	relatedAudioButtonsSlot?: ReactNode;
}

// ISO形式の日付を表示用にフォーマット（JST、秒単位まで）
const formatDate = (isoString: string) => {
	try {
		const date = new Date(isoString);
		return date.toLocaleString("ja-JP", {
			timeZone: "Asia/Tokyo",
			year: "numeric",
			month: "2-digit",
			day: "2-digit",
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
			hour12: false,
		});
	} catch {
		return isoString;
	}
};

// YouTubeカテゴリIDとカテゴリ名の対応表
const getYouTubeCategoryName = (categoryId?: string): string | null => {
	if (!categoryId) return null;

	const categories: Record<string, string> = {
		"1": "映画とアニメ",
		"2": "自動車と乗り物",
		"10": "音楽",
		"15": "ペットと動物",
		"17": "スポーツ",
		"19": "旅行とイベント",
		"20": "ゲーム",
		"22": "ブログ",
		"23": "コメディ",
		"24": "エンターテイメント",
		"25": "ニュースと政治",
		"26": "ハウツーとスタイル",
		"27": "教育",
		"28": "科学と技術",
		"29": "非営利団体と社会活動",
	};

	return categories[categoryId] || null;
};

// URLかどうかを判定する関数
const isValidUrl = (text: string): boolean => {
	try {
		new URL(text);
		return text.startsWith("http://") || text.startsWith("https://");
	} catch {
		return false;
	}
};

// 動画時間をフォーマット（ISO 8601 duration → hh:mm:ss）
const formatDuration = (duration?: string) => {
	if (!duration) return null;
	// PT1H2M3S → hh:mm:ss の形式に変換
	const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
	if (!match) return null;

	const hours = match[1] ? Number.parseInt(match[1], 10) : 0;
	const minutes = match[2] ? Number.parseInt(match[2], 10) : 0;
	const seconds = match[3] ? Number.parseInt(match[3], 10) : 0;

	// 常にhh:mm:ssフォーマットで表示
	return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
};

// 動画タイプバッジの情報を取得
function getVideoBadgeInfo(video: VideoPlainObject) {
	switch (video.liveBroadcastContent) {
		case "live":
			return {
				text: "配信中",
				icon: Radio,
				className: "bg-red-600/80 text-white border-none",
				ariaLabel: "現在配信中のライブ配信",
			};
		case "upcoming":
			return {
				text: "配信予告",
				icon: Clock,
				className: "bg-blue-600/80 text-white border-none",
				ariaLabel: "配信予定のライブ配信",
			};
		case "none":
			// videoType が"archived"の場合、または liveStreamingDetails に actualStartTime と actualEndTime がある場合は配信アーカイブ
			if (
				video.videoType === "archived" ||
				(video.liveStreamingDetails?.actualStartTime && video.liveStreamingDetails?.actualEndTime)
			) {
				return {
					text: "配信アーカイブ",
					icon: Radio,
					className: "bg-gray-600/80 text-white border-none",
					ariaLabel: "ライブ配信のアーカイブ",
				};
			}
			return {
				text: "動画",
				icon: Video,
				className: "bg-black/80 text-white border-none",
				ariaLabel: "動画コンテンツ",
			};
		default:
			return {
				text: "動画",
				icon: Video,
				className: "bg-black/80 text-white border-none",
				ariaLabel: "動画コンテンツ",
			};
	}
}

// 音声ボタン作成可能判定
function getCanCreateButtonData(video: VideoPlainObject, user: UserSession | null) {
	// ログインしていない場合
	if (!user) {
		return {
			canCreate: false,
			reason: "音声ボタンを作成するにはすずみなふぁみりーメンバーとしてログインが必要です",
		};
	}

	// 埋め込み制限チェック
	if (video.status?.embeddable === false) {
		return {
			canCreate: false,
			reason: "この動画は埋め込みが制限されているため、音声ボタンを作成できません",
		};
	}

	// 動画の条件をチェック
	const videoCanCreate = canCreateAudioButton(video);
	if (!videoCanCreate) {
		return {
			canCreate: false,
			reason: "許諾により音声ボタンを作成できるのは配信アーカイブのみです",
		};
	}

	return {
		canCreate: true,
		reason: null,
	};
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: 動画詳細の複雑な表示ロジックのため許容
export default function VideoDetail({
	video,
	initialTotalAudioCount = 0,
	relatedAudioButtonsSlot,
}: VideoDetailProps) {
	const user = useSession();

	// YouTube動画URLを生成
	const youtubeUrl = `https://youtube.com/watch?v=${video.videoId}`;

	// メモ化: 動画タイプバッジの情報
	const videoBadgeInfo = useMemo(() => getVideoBadgeInfo(video), [video]);

	// メモ化: 音声ボタン作成可能判定（認証状態も考慮）
	const canCreateButtonData = useMemo(() => getCanCreateButtonData(video, user), [video, user]);

	const canCreateButton = canCreateButtonData.canCreate;

	const _handleShare = () => {
		if (navigator.share) {
			navigator.share({
				title: video.title,
				text: video.description,
				url: window.location.href,
			});
		} else {
			// フォールバック: URLをクリップボードにコピー
			navigator.clipboard.writeText(window.location.href);
			alert("URLをクリップボードにコピーしました");
		}
	};

	return (
		<div className="max-w-7xl mx-auto space-y-6">
			{/* パンくずリスト */}
			<nav aria-label="パンくずリスト" className="text-sm">
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
						<Link href="/videos" className="hover:text-foreground transition-colors">
							動画一覧
						</Link>
					</li>
					<li className="shrink-0">
						<span className="mx-1">/</span>
					</li>
					<li className="text-foreground font-medium truncate min-w-0 max-w-[200px] sm:max-w-[300px] md:max-w-[400px] lg:max-w-[500px]">
						{video.title}
					</li>
				</ol>
			</nav>

			{/* メインコンテンツグリッド */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				{/* 左側：メインコンテンツ（2/3幅） */}
				<div className="lg:col-span-2 space-y-6">
					{/* 動画プレイヤーカード */}
					<Card className="overflow-hidden border-suzuka-200 dark:border-suzuka-800">
						{/* サムネイル/プレイヤー */}
						<div className="relative aspect-[16/9] bg-black overflow-hidden">
							<ThumbnailImage
								src={video.thumbnailUrl}
								alt={video.title}
								className="w-full h-full object-contain transition-transform duration-300 hover:scale-105"
								priority={true}
								width={1280}
								height={720}
								sizes="(max-width: 768px) 100vw, (max-width: 1200px) 66vw, 50vw"
							/>

							{/* プレイボタン */}
							<div className="absolute inset-0 flex items-center justify-center group/play">
								<Button
									size="lg"
									variant="secondary"
									className="bg-white/90 hover:bg-white text-black shadow-lg transition-all duration-300 group-hover/play:scale-110"
									asChild
								>
									<a
										href={youtubeUrl}
										target="_blank"
										rel="noopener noreferrer"
										aria-label={`${video.title}をYouTubeで再生`}
									>
										<PlayCircle className="h-8 w-8" />
									</a>
								</Button>
							</div>

							{/* ホバー時のオーバーレイ */}
							<div className="absolute inset-0 bg-black/20 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

							{/* 動画時間とタイプバッジ */}
							<div className="absolute bottom-4 left-4 flex items-center gap-2">
								{formatDuration(video.duration) && (
									<Badge className="bg-black/80 text-white border-none">
										{formatDuration(video.duration)}
									</Badge>
								)}
							</div>

							<div className="absolute top-4 right-4">
								<Badge className={videoBadgeInfo.className} aria-label={videoBadgeInfo.ariaLabel}>
									{React.createElement(videoBadgeInfo.icon, {
										className: "h-3 w-3 mr-1",
										"aria-hidden": "true",
									})}
									{videoBadgeInfo.text}
								</Badge>
							</div>
						</div>

						{/* 動画情報 */}
						<div className="p-6">
							<h1 className="text-2xl font-bold text-foreground mb-4">{video.title}</h1>

							{/* メタ情報 */}
							<div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
								<div className="flex items-center gap-1">
									<Calendar className="h-4 w-4" />
									{(() => {
										// ライブ配信の場合は配信開始時間を主として表示
										const isLiveStream = video.liveStreamingDetails?.actualStartTime;
										const streamStartTime = video.liveStreamingDetails?.actualStartTime;

										if (isLiveStream && streamStartTime) {
											return (
												<div className="flex flex-col">
													<span title="配信開始時間（JST）">
														配信開始: {formatDate(streamStartTime)}
													</span>
													<span className="text-xs opacity-75" title="動画公開時間（JST）">
														公開: {formatDate(video.publishedAt)}
													</span>
												</div>
											);
										}
										return <span title="日本標準時間（JST）">{formatDate(video.publishedAt)}</span>;
									})()}
								</div>
								{formatDuration(video.duration) && (
									<div className="flex items-center gap-1">
										<Timer className="h-4 w-4" />
										<span title="動画の長さ">{formatDuration(video.duration)}</span>
									</div>
								)}
								{video.statistics?.viewCount && (
									<div className="flex items-center gap-1">
										<Eye className="h-4 w-4" />
										<span title="視聴回数">
											{video.statistics.viewCount.toLocaleString("ja-JP")}回視聴
										</span>
									</div>
								)}
							</div>

							{/* アクションボタン */}
							<div className="flex flex-wrap gap-2 mb-6">
								<Button
									size="lg"
									className="bg-suzuka-500 hover:bg-suzuka-600 text-white"
									disabled={!canCreateButton}
									asChild={canCreateButton}
									title={canCreateButton ? undefined : canCreateButtonData.reason || undefined}
								>
									{canCreateButton ? (
										<Link
											href={`/buttons/create?video_id=${video.videoId}`}
											className="flex items-center whitespace-nowrap"
										>
											<Plus className="h-4 w-4 mr-2" />
											ボタンを作成
										</Link>
									) : (
										<span className="flex items-center whitespace-nowrap">
											<Plus className="h-4 w-4 mr-2" />
											ボタンを作成
										</span>
									)}
								</Button>
								<Button size="lg" variant="outline" asChild>
									<a href={youtubeUrl} target="_blank" rel="noopener noreferrer">
										<PlayCircle className="h-4 w-4 mr-2" />
										YouTubeで見る
									</a>
								</Button>
							</div>

							{/* タブナビゲーション */}
							<Tabs defaultValue="overview" className="w-full">
								<TabsList className="grid w-full grid-cols-5 mb-6">
									<TabsTrigger value="overview">概要</TabsTrigger>
									<TabsTrigger value="tags">タグ</TabsTrigger>
									<TabsTrigger value="statistics">統計情報</TabsTrigger>
									<TabsTrigger value="details">詳細情報</TabsTrigger>
									<TabsTrigger value="technical">技術仕様</TabsTrigger>
								</TabsList>

								{/* 概要タブ */}
								<TabsContent value="overview" className="space-y-4">
									<div>
										<h3 className="text-lg font-semibold mb-3">動画の説明</h3>
										{video.description ? (
											<div className="text-muted-foreground break-words">
												{formatDescriptionText(video.description)}
											</div>
										) : (
											<p className="text-muted-foreground">説明文はありません</p>
										)}
									</div>

									{/* タグ */}
									{(() => {
										const allTags = getVideoAllTags(video);
										return allTags.length > 0 ? (
											<div>
												<h4 className="font-medium mb-2">タグ</h4>
												<div className="flex flex-wrap gap-2">
													{allTags.slice(0, 10).map((tag) => (
														<Badge
															key={tag}
															variant="secondary"
															className="bg-suzuka-100 text-suzuka-700 dark:bg-suzuka-900 dark:text-suzuka-300"
														>
															{tag}
														</Badge>
													))}
												</div>
											</div>
										) : null;
									})()}
								</TabsContent>

								{/* タグタブ */}
								<TabsContent value="tags" className="space-y-4">
									<div>
										<h3 className="text-lg font-semibold mb-4">3層タグシステム</h3>
										<p className="text-sm text-muted-foreground mb-6">
											動画には3種類のタグが設定されています。プレイリストタグとカテゴリは自動で付与され、
											ユーザータグは登録ユーザーが編集できます。
										</p>
										<VideoUserTagEditor video={video} />
									</div>
								</TabsContent>

								{/* 統計情報タブ */}
								<TabsContent value="statistics" className="space-y-4">
									<div className="grid grid-cols-2 gap-4">
										<div className="bg-muted/30 p-4 rounded-lg">
											<h4 className="font-semibold mb-2">視聴回数</h4>
											<p className="text-2xl font-bold text-suzuka-600">
												{video.statistics?.viewCount?.toLocaleString("ja-JP") || "データなし"}
											</p>
											<p className="text-sm text-muted-foreground">回視聴</p>
										</div>

										<div className="bg-muted/30 p-4 rounded-lg">
											<h4 className="font-semibold mb-2">高評価数</h4>
											<p className="text-2xl font-bold text-suzuka-600">
												{video.statistics?.likeCount?.toLocaleString("ja-JP") || "データなし"}
											</p>
											<p className="text-sm text-muted-foreground">いいね</p>
										</div>

										<div className="bg-muted/30 p-4 rounded-lg">
											<h4 className="font-semibold mb-2">コメント数</h4>
											<p className="text-2xl font-bold text-suzuka-600">
												{video.statistics?.commentCount?.toLocaleString("ja-JP") || "データなし"}
											</p>
											<p className="text-sm text-muted-foreground">コメント</p>
										</div>

										{/* エンゲージメント率 */}
										{video.statistics?.viewCount && video.statistics?.likeCount && (
											<div className="bg-muted/30 p-4 rounded-lg">
												<h4 className="font-semibold mb-2">エンゲージメント率</h4>
												<p className="text-2xl font-bold text-suzuka-600">
													{(
														(video.statistics.likeCount / video.statistics.viewCount) *
														100
													).toFixed(2)}
													%
												</p>
												<p className="text-sm text-muted-foreground">
													高評価率（高評価数 ÷ 視聴回数）
												</p>
											</div>
										)}
									</div>
								</TabsContent>

								{/* 詳細情報タブ */}
								<TabsContent value="details" className="space-y-4">
									<div className="space-y-4">
										<div>
											<h4 className="font-semibold mb-2">チャンネル情報</h4>
											<p className="text-muted-foreground">{video.channelTitle}</p>
											<p className="text-sm text-muted-foreground">
												チャンネルID: {video.channelId}
											</p>
										</div>

										<div>
											<h4 className="font-semibold mb-2">公開情報</h4>
											<div className="space-y-2">
												<div>
													<span className="text-sm font-medium">公開日時:</span>
													<p
														className="text-muted-foreground font-mono text-sm"
														title="日本標準時間（JST）"
													>
														{formatDate(video.publishedAt)}
													</p>
												</div>
												<div>
													<span className="text-sm font-medium">情報更新:</span>
													<p
														className="text-muted-foreground font-mono text-sm"
														title="日本標準時間（JST）"
													>
														{formatDate(video.lastFetchedAt)}
													</p>
												</div>
												<div className="text-xs text-muted-foreground">
													※全ての日時は日本標準時間（JST）で表示
												</div>
											</div>
										</div>

										{/* カテゴリ情報 */}
										{video.categoryId && (
											<div>
												<h4 className="font-semibold mb-2">カテゴリ情報</h4>
												<div className="space-y-1">
													{(() => {
														const categoryName = getYouTubeCategoryName(video.categoryId);
														return (
															<>
																{categoryName && (
																	<p className="text-muted-foreground">
																		<span className="text-sm font-medium">カテゴリ:</span>
																		<span className="ml-2">{categoryName}</span>
																	</p>
																)}
																<p className="text-muted-foreground">
																	<span className="text-sm font-medium">カテゴリID:</span>
																	<span className="ml-2 font-mono">{video.categoryId}</span>
																	{!categoryName && (
																		<span className="ml-2 text-xs text-orange-600 dark:text-orange-400">
																			(未対応カテゴリ)
																		</span>
																	)}
																</p>
															</>
														);
													})()}
												</div>
											</div>
										)}

										{/* トピック詳細 */}
										{video.topicDetails?.topicCategories &&
											video.topicDetails.topicCategories.length > 0 && (
												<div>
													<h4 className="font-semibold mb-2">トピックカテゴリ</h4>
													<div className="space-y-1">
														{video.topicDetails.topicCategories.map((topic) => (
															<div key={topic} className="text-sm text-muted-foreground break-all">
																<span>• </span>
																{isValidUrl(topic) ? (
																	<a
																		href={topic}
																		target="_blank"
																		rel="noopener noreferrer"
																		className="inline-flex items-center gap-1 text-suzuka-600 hover:text-suzuka-700 underline underline-offset-4 decoration-suzuka-400 hover:decoration-suzuka-600 transition-colors"
																	>
																		{topic.length > 60 ? `${topic.substring(0, 57)}...` : topic}
																		<ExternalLink className="h-3 w-3 flex-shrink-0" />
																	</a>
																) : (
																	<span>{topic}</span>
																)}
															</div>
														))}
													</div>
												</div>
											)}

										{/* 撮影詳細 */}
										{video.recordingDetails && (
											<div>
												<h4 className="font-semibold mb-2">撮影詳細</h4>
												<div className="space-y-2">
													{video.recordingDetails.locationDescription && (
														<div>
															<span className="text-sm font-medium">撮影場所:</span>
															<p className="text-muted-foreground">
																{video.recordingDetails.locationDescription}
															</p>
														</div>
													)}
													{video.recordingDetails.recordingDate && (
														<div>
															<span className="text-sm font-medium">撮影日時:</span>
															<p className="text-muted-foreground font-mono text-sm">
																{formatDate(video.recordingDetails.recordingDate)}
															</p>
														</div>
													)}
												</div>
											</div>
										)}

										{/* 地域制限情報 */}
										{video.regionRestriction && (
											<div>
												<h4 className="font-semibold mb-2">地域制限</h4>
												<div className="space-y-2">
													{video.regionRestriction.allowed &&
														video.regionRestriction.allowed.length > 0 && (
															<div>
																<span className="text-sm font-medium">視聴可能地域:</span>
																<p className="text-muted-foreground text-sm">
																	{video.regionRestriction.allowed.join(", ")}
																</p>
															</div>
														)}
													{video.regionRestriction.blocked &&
														video.regionRestriction.blocked.length > 0 && (
															<div>
																<span className="text-sm font-medium">視聴制限地域:</span>
																<p className="text-muted-foreground text-sm">
																	{video.regionRestriction.blocked.join(", ")}
																</p>
															</div>
														)}
												</div>
											</div>
										)}

										{video.liveStreamingDetails && (
											<div>
												<h4 className="font-semibold mb-2">ライブ配信詳細</h4>
												<div className="space-y-2">
													{video.liveStreamingDetails.scheduledStartTime && (
														<div className="pl-4 border-l-2 border-muted">
															<p className="text-sm font-medium">予定開始時刻</p>
															<p className="text-muted-foreground font-mono text-sm">
																{formatDate(video.liveStreamingDetails.scheduledStartTime)}
															</p>
														</div>
													)}
													{video.liveStreamingDetails.actualStartTime && (
														<div className="pl-4 border-l-2 border-muted">
															<p className="text-sm font-medium">実際の開始時刻</p>
															<p className="text-muted-foreground font-mono text-sm">
																{formatDate(video.liveStreamingDetails.actualStartTime)}
															</p>
														</div>
													)}
													{video.liveStreamingDetails.actualEndTime && (
														<div className="pl-4 border-l-2 border-muted">
															<p className="text-sm font-medium">実際の終了時刻</p>
															<p className="text-muted-foreground font-mono text-sm">
																{formatDate(video.liveStreamingDetails.actualEndTime)}
															</p>
														</div>
													)}
													{video.liveStreamingDetails.scheduledEndTime && (
														<div className="pl-4 border-l-2 border-muted">
															<p className="text-sm font-medium">予定終了時刻</p>
															<p className="text-muted-foreground font-mono text-sm">
																{formatDate(video.liveStreamingDetails.scheduledEndTime)}
															</p>
														</div>
													)}
													{video.liveStreamingDetails.concurrentViewers && (
														<div className="pl-4 border-l-2 border-muted">
															<p className="text-sm font-medium">最大同時視聴者数</p>
															<p className="text-muted-foreground">
																{video.liveStreamingDetails.concurrentViewers.toLocaleString(
																	"ja-JP",
																)}{" "}
																人
															</p>
														</div>
													)}
													{/* 配信時間の計算 */}
													{video.liveStreamingDetails.actualStartTime &&
														video.liveStreamingDetails.actualEndTime && (
															<div className="pl-4 border-l-2 border-muted">
																<p className="text-sm font-medium">配信時間</p>
																<p className="text-muted-foreground">
																	{(() => {
																		const start = new Date(
																			video.liveStreamingDetails.actualStartTime,
																		);
																		const end = new Date(video.liveStreamingDetails.actualEndTime);
																		const diff = end.getTime() - start.getTime();
																		const hours = Math.floor(diff / (1000 * 60 * 60));
																		const minutes = Math.floor(
																			(diff % (1000 * 60 * 60)) / (1000 * 60),
																		);
																		return `${hours}時間${minutes}分`;
																	})()}
																</p>
															</div>
														)}
												</div>
											</div>
										)}
									</div>
								</TabsContent>

								{/* 技術仕様タブ */}
								<TabsContent value="technical" className="space-y-4">
									<div className="space-y-4">
										<div>
											<h4 className="font-semibold mb-2">動画詳細</h4>
											<div className="grid grid-cols-2 gap-4 text-sm">
												<div>
													<span className="text-muted-foreground">動画ID:</span>
													<span className="ml-2 font-mono">{video.videoId}</span>
												</div>
												{video.duration && (
													<div>
														<span className="text-muted-foreground">動画時間:</span>
														<span className="ml-2">
															{formatDuration(video.duration) || "データなし"}
															<span className="text-xs text-muted-foreground ml-2">
																({video.duration})
															</span>
														</span>
													</div>
												)}
												{video.definition && (
													<div>
														<span className="text-muted-foreground">解像度:</span>
														<span className="ml-2">
															{video.definition === "hd" ? "高解像度 (HD)" : "標準解像度 (SD)"}
														</span>
													</div>
												)}
												<div>
													<span className="text-muted-foreground">次元:</span>
													<span className="ml-2">
														{video.dimension === "2d"
															? "2D"
															: video.dimension === "3d"
																? "3D"
																: "データなし"}
													</span>
												</div>
												<div>
													<span className="text-muted-foreground">字幕:</span>
													<span className="ml-2">{video.caption ? "対応" : "非対応"}</span>
												</div>
												<div>
													<span className="text-muted-foreground">ライセンス:</span>
													<span className="ml-2">
														{video.licensedContent ? "ライセンス済み" : "標準"}
													</span>
												</div>
											</div>
										</div>

										{video.status && (
											<div>
												<h4 className="font-semibold mb-2">公開設定</h4>
												<div className="grid grid-cols-2 gap-4 text-sm">
													<div>
														<span className="text-muted-foreground">プライバシー:</span>
														<span className="ml-2">
															{video.status.privacyStatus === "public"
																? "公開"
																: video.status.privacyStatus === "unlisted"
																	? "限定公開"
																	: video.status.privacyStatus === "private"
																		? "非公開"
																		: "データなし"}
														</span>
													</div>
													<div>
														<span className="text-muted-foreground">コメント:</span>
														<span className="ml-2">
															{video.status.commentStatus || "データなし"}
														</span>
													</div>
													{video.status.embeddable !== undefined && (
														<div>
															<span className="text-muted-foreground">埋め込み:</span>
															<span className="ml-2">
																{video.status.embeddable === false ? "無効" : "許可"}
															</span>
														</div>
													)}
													{video.status.uploadStatus && (
														<div>
															<span className="text-muted-foreground">アップロード:</span>
															<span className="ml-2">{video.status.uploadStatus}</span>
														</div>
													)}
												</div>
											</div>
										)}

										{/* コンテンツレーティング */}
										{video.contentRating && Object.keys(video.contentRating).length > 0 && (
											<div>
												<h4 className="font-semibold mb-2">コンテンツレーティング</h4>
												<div className="grid grid-cols-2 gap-4 text-sm">
													{Object.entries(video.contentRating).map(([key, value]) => (
														<div key={key}>
															<span className="text-muted-foreground">{key}:</span>
															<span className="ml-2">{String(value)}</span>
														</div>
													))}
												</div>
											</div>
										)}

										{/* プレイヤー情報 */}
										{video.player && (
											<div>
												<h4 className="font-semibold mb-2">プレイヤー情報</h4>
												<div className="grid grid-cols-2 gap-4 text-sm">
													{video.player.embedWidth && (
														<div>
															<span className="text-muted-foreground">埋め込み幅:</span>
															<span className="ml-2">{video.player.embedWidth}px</span>
														</div>
													)}
													{video.player.embedHeight && (
														<div>
															<span className="text-muted-foreground">埋め込み高さ:</span>
															<span className="ml-2">{video.player.embedHeight}px</span>
														</div>
													)}
												</div>
												{video.player.embedHtml && (
													<div className="mt-2">
														<span className="text-sm font-medium text-muted-foreground">
															埋め込みHTML:
														</span>
														<pre className="mt-1 text-xs bg-muted p-2 rounded overflow-x-auto max-h-32">
															{video.player.embedHtml}
														</pre>
													</div>
												)}
											</div>
										)}
									</div>
								</TabsContent>
							</Tabs>
						</div>
					</Card>
				</div>

				{/* 右側：サイドバー（1/3幅） */}
				<div className="space-y-6">
					{/* この動画のボタン */}
					<Card className="p-6 bg-suzuka-50 dark:bg-suzuka-950 border-suzuka-200 dark:border-suzuka-800">
						<div className="flex items-center justify-between mb-4">
							<h3 className="text-lg font-semibold text-suzuka-700 dark:text-suzuka-300">
								🔊 この動画のボタン ({initialTotalAudioCount})
							</h3>
							{canCreateButton && (
								<Button
									size="sm"
									variant="outline"
									className="text-suzuka-600 border-suzuka-300 hover:bg-suzuka-100"
									asChild
								>
									<Link href={`/buttons/create?video_id=${video.videoId}`}>新規作成</Link>
								</Button>
							)}
						</div>

						{/* 音声ボタンのSlot */}
						{relatedAudioButtonsSlot}
					</Card>

					{/* チャンネル情報 */}
					<Card className="p-6">
						<h3 className="font-semibold text-foreground mb-4">チャンネル情報</h3>
						<div className="space-y-3">
							<div className="flex items-center gap-3">
								<div className="h-12 w-12 rounded-full bg-suzuka-200 dark:bg-suzuka-800 flex items-center justify-center">
									<span className="text-suzuka-700 dark:text-suzuka-300 font-semibold">
										{video.channelTitle.charAt(0)}
									</span>
								</div>
								<div>
									<p className="font-medium text-foreground">{video.channelTitle}</p>
									<p className="text-sm text-muted-foreground">YouTube チャンネル</p>
								</div>
							</div>
						</div>
					</Card>
				</div>
			</div>
		</div>
	);
}
