"use client";

import { type FrontendAudioButtonData, getCategoryDisplayName } from "@suzumina.click/shared-types";
import { Badge } from "@suzumina.click/ui/components/ui/badge";
import { Button } from "@suzumina.click/ui/components/ui/button";
import { Card, CardContent } from "@suzumina.click/ui/components/ui/card";
import { Clock, Edit, Eye, FileAudio, Music, Play, Trash2, User, Youtube } from "lucide-react";
import Link from "next/link";

type ButtonListProps = {
	buttons: FrontendAudioButtonData[];
};

export function ButtonList({ buttons }: ButtonListProps) {
	if (buttons.length === 0) {
		return (
			<div className="text-center py-8">
				<Music className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
				<p className="text-muted-foreground">音声ボタンが見つかりませんでした</p>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			{buttons.map((button) => (
				<Card key={button.id} className="hover:shadow-md transition-shadow">
					<CardContent className="p-4">
						<div className="flex items-start justify-between gap-4">
							{/* メイン情報 */}
							<div className="flex-1 min-w-0">
								{/* ヘッダー */}
								<div className="flex items-center gap-2 mb-2">
									<Badge
										variant={
											button.category === "special"
												? "default"
												: button.category === "normal"
													? "secondary"
													: "outline"
										}
									>
										{getCategoryDisplayName(button.category)}
									</Badge>
									<Badge variant="outline" className="flex items-center gap-1">
										{button.audioFileUrl ? (
											<>
												<FileAudio className="h-3 w-3" />
												音声ファイル
											</>
										) : (
											<>
												<Youtube className="h-3 w-3" />
												YouTube
											</>
										)}
									</Badge>
									<div className="flex items-center gap-1 text-xs text-muted-foreground">
										<Clock className="h-3 w-3" />
										{new Date(button.createdAt).toLocaleString("ja-JP")}
									</div>
								</div>

								{/* タイトル */}
								<h3 className="font-semibold text-foreground mb-2 truncate">{button.title}</h3>

								{/* 説明 */}
								{button.description && (
									<p className="text-sm text-muted-foreground line-clamp-2 mb-3">
										{button.description}
									</p>
								)}

								{/* メタ情報 */}
								<div className="flex items-center gap-4 text-xs text-muted-foreground">
									{button.userName && (
										<div className="flex items-center gap-1">
											<User className="h-3 w-3" />
											<span className="truncate max-w-[200px]">{button.userName}</span>
										</div>
									)}
									{button.videoTitle && (
										<div className="flex items-center gap-1">
											<Youtube className="h-3 w-3" />
											<span className="truncate max-w-[300px]">{button.videoTitle}</span>
										</div>
									)}
									{button.duration && (
										<div className="flex items-center gap-1">
											<Clock className="h-3 w-3" />
											<span>{button.duration}秒</span>
										</div>
									)}
								</div>
							</div>

							{/* アクション */}
							<div className="flex flex-col gap-2">
								<Button variant="outline" size="sm" asChild>
									<Link href={`/admin/buttons/${button.id}`} className="flex items-center gap-2">
										<Eye className="h-3 w-3" />
										詳細
									</Link>
								</Button>

								<Button variant="secondary" size="sm" className="flex items-center gap-2">
									<Play className="h-3 w-3" />
									再生
								</Button>

								<Button variant="outline" size="sm" className="flex items-center gap-2">
									<Edit className="h-3 w-3" />
									編集
								</Button>

								<Button variant="destructive" size="sm" className="flex items-center gap-2">
									<Trash2 className="h-3 w-3" />
									削除
								</Button>
							</div>
						</div>

						{/* 音声情報の詳細表示 */}
						{button.audioFileUrl ? (
							<div className="mt-3 p-2 bg-green-50 border border-green-200 rounded-md">
								<div className="flex items-center gap-2 text-xs text-green-700">
									<FileAudio className="h-3 w-3" />
									<span className="font-medium">音声ファイル: 直接再生可能</span>
								</div>
							</div>
						) : (
							button.youtubeVideoId && (
								<div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded-md">
									<div className="flex items-center gap-2 text-xs text-blue-700">
										<Youtube className="h-3 w-3" />
										<span className="font-medium">
											YouTube: {button.startTime}秒〜{button.endTime}秒
										</span>
									</div>
								</div>
							)
						)}
					</CardContent>
				</Card>
			))}
		</div>
	);
}
