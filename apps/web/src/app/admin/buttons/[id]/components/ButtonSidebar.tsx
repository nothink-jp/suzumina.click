import type { FrontendAudioButtonData } from "@suzumina.click/shared-types";
import { Button } from "@suzumina.click/ui/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@suzumina.click/ui/components/ui/card";
import { Clock, Download, Edit, ExternalLink, Music, User } from "lucide-react";
import Link from "next/link";

interface ButtonSidebarProps {
	button: FrontendAudioButtonData;
}

export function ButtonSidebar({ button }: ButtonSidebarProps) {
	return (
		<div className="space-y-6">
			{/* 基本情報 */}
			<Card>
				<CardHeader>
					<CardTitle className="text-base">基本情報</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					<div className="flex items-center gap-2 text-sm">
						<Clock className="h-4 w-4 text-muted-foreground" />
						<div>
							<div className="font-medium">作成日時</div>
							<div className="text-muted-foreground">
								{new Date(button.createdAt).toLocaleString("ja-JP")}
							</div>
						</div>
					</div>

					{button.uploadedByName && (
						<div className="flex items-center gap-2 text-sm">
							<User className="h-4 w-4 text-muted-foreground" />
							<div>
								<div className="font-medium">作成者</div>
								<div className="text-muted-foreground">{button.uploadedByName}</div>
							</div>
						</div>
					)}

					<div className="flex items-center gap-2 text-sm">
						<Music className="h-4 w-4 text-muted-foreground" />
						<div>
							<div className="font-medium">ボタンID</div>
							<div className="text-muted-foreground font-mono text-xs break-all">{button.id}</div>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* アクション */}
			<Card>
				<CardHeader>
					<CardTitle className="text-base">管理アクション</CardTitle>
				</CardHeader>
				<CardContent className="space-y-2">
					<Button variant="outline" className="w-full" asChild>
						<Link
							href={`/buttons/${button.id}`}
							className="flex items-center gap-2"
							target="_blank"
						>
							<ExternalLink className="h-4 w-4" />
							ユーザー画面で表示
						</Link>
					</Button>

					{button.audioFileUrl && (
						<Button variant="outline" className="w-full">
							<Download className="h-4 w-4 mr-2" />
							音声ファイルをダウンロード
						</Button>
					)}

					<Button variant="outline" className="w-full">
						<Edit className="h-4 w-4 mr-2" />
						編集
					</Button>

					<Button variant="destructive" className="w-full">
						削除
					</Button>
				</CardContent>
			</Card>

			{/* カテゴリ別の管理ガイド */}
			<Card>
				<CardHeader>
					<CardTitle className="text-base">管理ガイド</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="text-xs space-y-2">
						{button.category === "voice" && (
							<div className="space-y-1">
								<div className="font-medium text-suzuka-600">特別ボタン</div>
								<ul className="text-muted-foreground space-y-1">
									<li>• 高品質・特別な音声</li>
									<li>• 削除時は慎重に判断</li>
									<li>• ユーザー体験への影響大</li>
								</ul>
							</div>
						)}
						{button.category === "bgm" && (
							<div className="space-y-1">
								<div className="font-medium text-blue-600">通常ボタン</div>
								<ul className="text-muted-foreground space-y-1">
									<li>• 一般的な音声ボタン</li>
									<li>• 品質確認を定期実施</li>
									<li>• 重複チェック推奨</li>
								</ul>
							</div>
						)}
						{button.audioFileUrl ? (
							<div className="space-y-1">
								<div className="font-medium text-green-600">音声ファイル</div>
								<ul className="text-muted-foreground space-y-1">
									<li>• 高品質な音声</li>
									<li>• ストレージ使用量に注意</li>
									<li>• バックアップ推奨</li>
								</ul>
							</div>
						) : (
							<div className="space-y-1">
								<div className="font-medium text-blue-600">YouTube参照</div>
								<ul className="text-muted-foreground space-y-1">
									<li>• 元動画の可用性に依存</li>
									<li>• 定期的な動作確認</li>
									<li>• 時間指定の精度確認</li>
								</ul>
							</div>
						)}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
