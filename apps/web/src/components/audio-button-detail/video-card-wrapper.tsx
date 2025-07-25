import { Button } from "@suzumina.click/ui/components/ui/button";
import { Card, CardContent } from "@suzumina.click/ui/components/ui/card";
import { Youtube } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { getVideoByIdV2 } from "@/app/videos/actions-v2";
import VideoCard from "@/app/videos/components/VideoCard";

interface VideoCardWrapperProps {
	videoId: string;
	fallbackTitle?: string;
}

export async function VideoCardWrapper({ videoId, fallbackTitle }: VideoCardWrapperProps) {
	try {
		const video = await getVideoByIdV2(videoId);

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
