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

					{button.createdByName && (
						<div className="flex items-center gap-2 text-sm">
							<User className="h-4 w-4 text-muted-foreground" />
							<div>
								<div className="font-medium">作成者</div>
								<div className="text-muted-foreground">{button.createdByName}</div>
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

					<Button variant="outline" className="w-full">
						<Download className="h-4 w-4 mr-2" />
						YouTube動画を開く
					</Button>

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
						<div className="space-y-1">
							<div className="font-medium text-suzuka-600">音声ボタン管理</div>
							<ul className="text-muted-foreground space-y-1">
								<li>• タグで内容を分類・検索</li>
								<li>• 削除時は慎重に判断</li>
								<li>• ユーザー体験への影響を考慮</li>
								<li>• 品質確認を定期実施</li>
							</ul>
						</div>
						<div className="space-y-1">
							<div className="font-medium text-blue-600">YouTube参照</div>
							<ul className="text-muted-foreground space-y-1">
								<li>• 元動画の可用性に依存</li>
								<li>• 定期的な動作確認</li>
								<li>• 時間指定の精度確認</li>
							</ul>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
