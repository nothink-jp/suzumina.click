import { Badge } from "@suzumina.click/ui/components/ui/badge";
import { Button } from "@suzumina.click/ui/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@suzumina.click/ui/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@suzumina.click/ui/components/ui/table";
import {
	ArrowLeft,
	Calendar,
	ChevronLeft,
	ChevronRight,
	Clock,
	Eye,
	Play,
	ThumbsUp,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { RefreshButton } from "@/components/RefreshButton";
import { VideoActionsCell } from "@/components/VideoActionsCell";
import { auth } from "@/lib/auth";
import { getFirestore } from "@/lib/firestore";

// 動画データの型定義
interface VideoData {
	id: string;
	videoId: string;
	title: string;
	description: string;
	publishedAt: string;
	duration: string;
	viewCount: number;
	likeCount: number;
	thumbnailUrl: string;
	channelTitle: string;
	tags: string[];
	lastUpdated: string;
}

// 動画一覧取得関数（ページネーション対応）
async function getVideos(
	page = 1,
	limit = 100,
): Promise<{
	videos: VideoData[];
	totalCount: number;
	currentPage: number;
	totalPages: number;
	hasNext: boolean;
	hasPrev: boolean;
}> {
	try {
		const firestore = getFirestore();

		// 総件数を取得
		const totalSnap = await firestore.collection("videos").get();
		const totalCount = totalSnap.size;

		// ページング計算
		const _offset = (page - 1) * limit;
		const totalPages = Math.ceil(totalCount / limit);

		// ページ範囲チェック
		const currentPage = Math.max(1, Math.min(page, totalPages));
		const actualOffset = (currentPage - 1) * limit;

		// データ取得（publishedAtでソート）
		const videosSnap = await firestore
			.collection("videos")
			.orderBy("publishedAt", "desc")
			.offset(actualOffset)
			.limit(limit)
			.get();

		const videos = videosSnap.docs.map((doc) => {
			const data = doc.data();
			return {
				id: doc.id,
				videoId: data.videoId || doc.id,
				title: data.title || "無題",
				description: data.description || "",
				publishedAt: data.publishedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
				duration: data.duration || "不明",
				viewCount: data.viewCount || 0,
				likeCount: data.likeCount || 0,
				thumbnailUrl: data.thumbnailUrl || "",
				channelTitle: data.channelTitle || "Unknown Channel",
				tags: data.tags || [],
				lastUpdated: data.lastUpdated?.toDate?.()?.toISOString() || new Date().toISOString(),
			};
		});

		return {
			videos,
			totalCount,
			currentPage,
			totalPages,
			hasNext: currentPage < totalPages,
			hasPrev: currentPage > 1,
		};
	} catch (_error) {
		return {
			videos: [],
			totalCount: 0,
			currentPage: 1,
			totalPages: 1,
			hasNext: false,
			hasPrev: false,
		};
	}
}

// 再生時間フォーマット
function formatDuration(duration: string): string {
	// ISO 8601 形式 (PT4M13S) を "4:13" 形式に変換
	const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
	if (!match) return duration;

	const hours = Number.parseInt(match[1] || "0");
	const minutes = Number.parseInt(match[2] || "0");
	const seconds = Number.parseInt(match[3] || "0");

	if (hours > 0) {
		return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
	}
	return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

// 数値フォーマット
function formatNumber(num: number): string {
	if (num >= 1000000) {
		return `${(num / 1000000).toFixed(1)}M`;
	}
	if (num >= 1000) {
		return `${(num / 1000).toFixed(1)}K`;
	}
	return num.toString();
}

interface VideosPageProps {
	searchParams: Promise<{
		page?: string;
	}>;
}

export default async function VideosPage({ searchParams }: VideosPageProps) {
	const session = await auth();

	if (!session?.user?.isAdmin) {
		redirect("/login");
	}

	// ページ番号を取得
	const params = await searchParams;
	const currentPage = Math.max(1, Number.parseInt(params.page || "1", 10));

	const result = await getVideos(currentPage, 100);
	const { videos, totalCount, totalPages, hasNext, hasPrev } = result;

	// 統計計算
	const stats = {
		total: totalCount,
		totalViews: videos.reduce((sum, v) => sum + v.viewCount, 0),
		totalLikes: videos.reduce((sum, v) => sum + v.likeCount, 0),
		latestVideo: videos[0]?.publishedAt,
		totalDuration: videos.length > 0 ? "計算中" : "0",
	};

	return (
		<div className="p-6 space-y-6">
			{/* ページヘッダー */}
			<div className="flex items-center gap-4">
				<Button variant="outline" size="sm" asChild>
					<Link href="/" className="gap-2">
						<ArrowLeft className="h-4 w-4" />
						ダッシュボードに戻る
					</Link>
				</Button>
				<div className="flex-1">
					<h1 className="text-3xl font-bold text-foreground">動画管理</h1>
					<p className="text-muted-foreground mt-1">YouTube動画データの管理・監視</p>
				</div>
				<RefreshButton />
			</div>

			{/* 統計カード */}
			<div className="grid grid-cols-2 md:grid-cols-5 gap-4">
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium flex items-center gap-2">
							<Play className="h-4 w-4" />
							総動画数
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{stats.total}</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium">総再生数</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-blue-600">{formatNumber(stats.totalViews)}</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium">総いいね数</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-pink-600">{formatNumber(stats.totalLikes)}</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium">最新動画</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-sm">
							{stats.latestVideo ? new Date(stats.latestVideo).toLocaleDateString("ja-JP") : "なし"}
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium">データ同期</CardTitle>
					</CardHeader>
					<CardContent>
						<Badge variant="outline" className="text-green-600 border-green-600">
							自動実行中
						</Badge>
					</CardContent>
				</Card>
			</div>

			{/* 動画テーブル */}
			<Card>
				<CardHeader>
					<CardTitle>動画一覧</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="rounded-md border">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>動画</TableHead>
									<TableHead>チャンネル</TableHead>
									<TableHead>再生時間</TableHead>
									<TableHead>統計</TableHead>
									<TableHead>公開日</TableHead>
									<TableHead>最終更新</TableHead>
									<TableHead className="text-right">操作</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{videos.map((video) => (
									<TableRow key={video.id}>
										<TableCell className="font-medium">
											<div className="flex items-start gap-3 max-w-md">
												{video.thumbnailUrl && (
													<Image
														src={video.thumbnailUrl}
														alt=""
														width={64}
														height={48}
														className="w-16 h-12 rounded object-cover flex-shrink-0"
														unoptimized
													/>
												)}
												<div className="min-w-0 flex-1">
													<div className="font-semibold line-clamp-2 text-sm">{video.title}</div>
													<code className="text-xs text-muted-foreground">{video.videoId}</code>
												</div>
											</div>
										</TableCell>
										<TableCell>
											<div className="text-sm">{video.channelTitle}</div>
										</TableCell>
										<TableCell>
											<div className="flex items-center gap-1 text-sm">
												<Clock className="h-3 w-3" />
												{formatDuration(video.duration)}
											</div>
										</TableCell>
										<TableCell>
											<div className="space-y-1 text-xs">
												<div className="flex items-center gap-1">
													<Eye className="h-3 w-3" />
													{formatNumber(video.viewCount)}
												</div>
												<div className="flex items-center gap-1">
													<ThumbsUp className="h-3 w-3" />
													{formatNumber(video.likeCount)}
												</div>
											</div>
										</TableCell>
										<TableCell>
											<div className="flex items-center gap-1 text-sm">
												<Calendar className="h-3 w-3" />
												{new Date(video.publishedAt).toLocaleDateString("ja-JP")}
											</div>
										</TableCell>
										<TableCell className="text-sm">
											{new Date(video.lastUpdated).toLocaleDateString("ja-JP")}
										</TableCell>
										<TableCell className="text-right">
											<VideoActionsCell video={video} />
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>

					{videos.length === 0 && (
						<div className="text-center py-8 text-muted-foreground">動画データが見つかりません</div>
					)}

					{/* ページネーション */}
					{totalPages > 1 && (
						<div className="flex items-center justify-between px-2 py-4">
							<div className="flex items-center gap-2">
								<p className="text-sm text-muted-foreground">
									ページ {currentPage} / {totalPages} （総件数: {totalCount}件）
								</p>
							</div>
							<div className="flex items-center gap-2">
								<Button
									variant="outline"
									size="sm"
									asChild={hasPrev}
									disabled={!hasPrev}
									className="gap-1"
								>
									{hasPrev ? (
										<Link href={`/videos?page=${currentPage - 1}`}>
											<ChevronLeft className="h-4 w-4" />
											前のページ
										</Link>
									) : (
										<>
											<ChevronLeft className="h-4 w-4" />
											前のページ
										</>
									)}
								</Button>
								<Button
									variant="outline"
									size="sm"
									asChild={hasNext}
									disabled={!hasNext}
									className="gap-1"
								>
									{hasNext ? (
										<Link href={`/videos?page=${currentPage + 1}`}>
											次のページ
											<ChevronRight className="h-4 w-4" />
										</Link>
									) : (
										<>
											次のページ
											<ChevronRight className="h-4 w-4" />
										</>
									)}
								</Button>
							</div>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
