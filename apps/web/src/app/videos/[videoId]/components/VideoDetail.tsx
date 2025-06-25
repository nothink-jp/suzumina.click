"use client";

import type { FrontendAudioButtonData } from "@suzumina.click/shared-types/src/audio-button";
import type { FrontendVideoData } from "@suzumina.click/shared-types/src/video";
import { Badge } from "@suzumina.click/ui/components/ui/badge";
import { Button } from "@suzumina.click/ui/components/ui/button";
import { Card } from "@suzumina.click/ui/components/ui/card";
import { Calendar, Eye, Hash, PlayCircle, Plus, Share2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getAudioButtons } from "@/app/buttons/actions";
import ThumbnailImage from "@/components/ThumbnailImage";

interface VideoDetailProps {
	video: FrontendVideoData;
}

export default function VideoDetail({ video }: VideoDetailProps) {
	const [audioButtons, setAudioButtons] = useState<FrontendAudioButtonData[]>([]);
	const [audioLoading, setAudioLoading] = useState(false);
	const [audioCount, setAudioCount] = useState(0);

	// 音声ボタンを取得
	useEffect(() => {
		const fetchAudioButtons = async () => {
			setAudioLoading(true);
			try {
				const result = await getAudioButtons({
					sourceVideoId: video.videoId,
					limit: 6,
					sortBy: "newest",
				});

				if (result.success) {
					setAudioButtons(result.data.audioButtons);
					setAudioCount(result.data.audioButtons.length);
				}
			} catch (_error) {
				// 音声ボタン取得エラーは無視してページ表示を継続
			} finally {
				setAudioLoading(false);
			}
		};

		fetchAudioButtons();
	}, [video.videoId]);

	// ISO形式の日付を表示用にフォーマット
	const formatDate = (isoString: string) => {
		try {
			const date = new Date(isoString);
			return date.toLocaleDateString("ja-JP", {
				year: "numeric",
				month: "long",
				day: "numeric",
			});
		} catch {
			return isoString;
		}
	};

	// YouTube動画URLを生成
	const youtubeUrl = `https://youtube.com/watch?v=${video.videoId}`;

	const handleShare = () => {
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
				<ol className="flex items-center space-x-2 text-muted-foreground">
					<li>
						<Link href="/" className="hover:text-foreground transition-colors">
							ホーム
						</Link>
					</li>
					<li>
						<span className="mx-1">/</span>
					</li>
					<li>
						<Link href="/videos" className="hover:text-foreground transition-colors">
							動画一覧
						</Link>
					</li>
					<li>
						<span className="mx-1">/</span>
					</li>
					<li className="text-foreground font-medium truncate max-w-xs">{video.title}</li>
				</ol>
			</nav>

			{/* メインコンテンツグリッド */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				{/* 左側：メインコンテンツ（2/3幅） */}
				<div className="lg:col-span-2 space-y-6">
					{/* 動画カード */}
					<Card className="overflow-hidden border-suzuka-200 dark:border-suzuka-800">
						{/* サムネイル */}
						<div className="relative aspect-video bg-muted">
							<ThumbnailImage
								src={video.thumbnailUrl}
								alt={video.title}
								className="w-full h-full object-cover"
							/>
							{/* 動画時間バッジ（もしあれば） */}
							<div className="absolute top-4 right-4">
								<Badge className="bg-black/80 text-white border-none">
									<PlayCircle className="h-3 w-3 mr-1" />
									動画
								</Badge>
							</div>
						</div>

						{/* 動画情報 */}
						<div className="p-6 space-y-4">
							<div>
								<h1 className="text-2xl font-bold text-foreground mb-3">{video.title}</h1>

								{/* メタ情報 */}
								<div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
									<div className="flex items-center gap-1">
										<Eye className="h-4 w-4" />
										<span>15,420 回視聴</span>
									</div>
									<div className="flex items-center gap-1">
										<Calendar className="h-4 w-4" />
										<span>{formatDate(video.publishedAt)}</span>
									</div>
								</div>
							</div>

							{/* アクションボタン */}
							<div className="flex flex-wrap gap-2">
								<Button size="lg" className="bg-suzuka-500 hover:bg-suzuka-600 text-white" asChild>
									<Link href={`/buttons/create?video_id=${video.videoId}`}>
										<Plus className="h-4 w-4 mr-2" />
										ボタンを作成
									</Link>
								</Button>
								<Button size="lg" variant="outline" asChild>
									<a href={youtubeUrl} target="_blank" rel="noopener noreferrer">
										<PlayCircle className="h-4 w-4 mr-2" />
										YouTubeで見る
									</a>
								</Button>
								<Button size="lg" variant="ghost" onClick={handleShare}>
									<Share2 className="h-4 w-4" />
								</Button>
							</div>

							{/* 説明文 */}
							{video.description && (
								<div className="pt-4 border-t">
									<p className="text-muted-foreground whitespace-pre-wrap break-words">
										{video.description}
									</p>
									{/* ハッシュタグ風の表示（説明文から抽出） */}
									<div className="flex flex-wrap gap-2 mt-4">
										{video.description
											.match(/#\S+/g)
											?.slice(0, 5)
											.map((tag) => (
												<Badge
													key={tag}
													variant="secondary"
													className="bg-suzuka-100 text-suzuka-700 dark:bg-suzuka-900 dark:text-suzuka-300"
												>
													<Hash className="h-3 w-3 mr-1" />
													{tag.slice(1)}
												</Badge>
											))}
									</div>
								</div>
							)}
						</div>
					</Card>

					{/* 音声ボタンセクション */}
					<Card className="p-6 bg-suzuka-50 dark:bg-suzuka-950 border-suzuka-200 dark:border-suzuka-800">
						<div className="flex items-center justify-between mb-4">
							<h2 className="text-xl font-semibold text-foreground">
								この動画から作成されたボタン
							</h2>
							{audioCount > 0 && (
								<Badge
									variant="secondary"
									className="bg-suzuka-200 text-suzuka-700 dark:bg-suzuka-800 dark:text-suzuka-300"
								>
									{audioCount}個
								</Badge>
							)}
						</div>

						{audioLoading ? (
							<div className="flex items-center justify-center py-12">
								<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-suzuka-500" />
							</div>
						) : audioButtons.length > 0 ? (
							<div className="space-y-4">
								{/* 音声ボタン一覧 */}
								<div className="grid grid-cols-1 gap-3">
									{audioButtons.map((audioButton) => (
										<Card key={audioButton.id} className="p-4 hover:shadow-md transition-shadow">
											<div className="flex items-center justify-between">
												<div className="flex-1">
													<h3 className="font-medium text-foreground mb-1">{audioButton.title}</h3>
													<div className="flex items-center gap-4 text-sm text-muted-foreground">
														<span>
															{audioButton.startTime}秒 - {audioButton.endTime}秒
														</span>
														<span>by {audioButton.uploadedByName}</span>
													</div>
												</div>
												<Button size="sm" variant="ghost" asChild>
													<Link href={`/buttons/${audioButton.id}`}>
														<PlayCircle className="h-4 w-4" />
													</Link>
												</Button>
											</div>
										</Card>
									))}
								</div>

								{/* もっと見るボタン */}
								<div className="pt-4 border-t flex justify-center">
									<Button variant="outline" asChild>
										<Link href={`/buttons?sourceVideoId=${video.videoId}`}>
											すべてのボタンを見る
										</Link>
									</Button>
								</div>
							</div>
						) : (
							<div className="text-center py-12">
								<p className="text-muted-foreground mb-4">まだボタンが作成されていません</p>
								<Button className="bg-suzuka-500 hover:bg-suzuka-600 text-white" asChild>
									<Link href={`/buttons/create?video_id=${video.videoId}`}>
										<Plus className="h-4 w-4 mr-2" />
										最初のボタンを作成
									</Link>
								</Button>
							</div>
						)}
					</Card>
				</div>

				{/* 右側：サイドバー（1/3幅） */}
				<div className="space-y-6">
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

					{/* 関連動画（将来的に追加） */}
					<Card className="p-6">
						<h3 className="font-semibold text-foreground mb-4">関連動画</h3>
						<p className="text-sm text-muted-foreground">関連動画はまだありません</p>
					</Card>
				</div>
			</div>
		</div>
	);
}
