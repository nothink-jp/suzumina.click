import { Badge } from "@suzumina.click/ui/components/ui/badge";
import { Button } from "@suzumina.click/ui/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@suzumina.click/ui/components/ui/card";
import { ExternalLink, Github, Heart, Music, Play, Shield } from "lucide-react";
import Link from "next/link";

export default function AboutPage() {
	return (
		<div className="container mx-auto px-4 py-8 max-w-4xl">
			{/* ページヘッダー */}
			<div className="text-center mb-8">
				<h1 className="text-3xl font-bold text-foreground mb-4">suzumina.click について</h1>
				<p className="text-lg text-muted-foreground">
					涼花みなせさんのファンによる、ファンのための
					<Badge variant="outline" className="mx-2">
						非公式
					</Badge>
					コミュニティサイトです
				</p>
			</div>

			<div className="space-y-8">
				{/* サイトの目的 */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Heart className="h-5 w-5 text-suzuka-500" />
							サイトの目的
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<p className="text-foreground">
							suzumina.clickは、声優「涼花みなせ」さんのファンコミュニティのためのWebプラットフォームです。
						</p>
						<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
							<div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
								<Music className="h-5 w-5 text-suzuka-500" />
								<span className="text-sm">音声ボタンの作成・共有</span>
							</div>
							<div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
								<Play className="h-5 w-5 text-minase-500" />
								<span className="text-sm">YouTube動画の整理・検索</span>
							</div>
							<div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
								<ExternalLink className="h-5 w-5 text-suzuka-500" />
								<span className="text-sm">DLsite作品情報の閲覧</span>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* 重要な注意事項 */}
				<Card className="border-destructive/20">
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-destructive">
							<Shield className="h-5 w-5" />
							重要な注意事項
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-3">
						<div className="bg-destructive/5 p-4 rounded-lg">
							<h4 className="font-semibold text-destructive mb-2">非公式サイト</h4>
							<p className="text-sm text-muted-foreground">
								涼花みなせさんや所属事務所とは一切関係ありません
							</p>
						</div>
						<div className="bg-orange-50 p-4 rounded-lg">
							<h4 className="font-semibold text-orange-700 mb-2">ファン活動</h4>
							<p className="text-sm text-muted-foreground">個人が趣味で運営しています</p>
						</div>
						<div className="bg-blue-50 p-4 rounded-lg">
							<h4 className="font-semibold text-blue-700 mb-2">著作権</h4>
							<p className="text-sm text-muted-foreground">
								すべての音声・画像の著作権は原著作者に帰属します
							</p>
						</div>
					</CardContent>
				</Card>

				{/* 主な機能 */}
				<Card>
					<CardHeader>
						<CardTitle>主な機能</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div className="space-y-2">
								<h4 className="font-semibold flex items-center gap-2">🎵 音声ボタン作成・再生</h4>
								<p className="text-sm text-muted-foreground">
									YouTube動画から音声ボタンを作成して共有できます
								</p>
							</div>
							<div className="space-y-2">
								<h4 className="font-semibold flex items-center gap-2">📺 YouTube動画一覧・検索</h4>
								<p className="text-sm text-muted-foreground">
									配信アーカイブや動画を整理して閲覧できます
								</p>
							</div>
							<div className="space-y-2">
								<h4 className="font-semibold flex items-center gap-2">🛒 DLsite作品情報表示</h4>
								<p className="text-sm text-muted-foreground">音声作品の情報を確認できます</p>
							</div>
							<div className="space-y-2">
								<h4 className="font-semibold flex items-center gap-2">
									🔐 Discord認証（すずみなふぁみりー限定）
								</h4>
								<p className="text-sm text-muted-foreground">
									ファンコミュニティメンバー限定でご利用いただけます
								</p>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* 技術仕様 */}
				<Card>
					<CardHeader>
						<CardTitle>技術仕様</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
							<div>
								<h4 className="font-semibold mb-2">フロントエンド</h4>
								<ul className="space-y-1 text-muted-foreground">
									<li>• Next.js 15</li>
									<li>• TypeScript</li>
									<li>• Tailwind CSS</li>
								</ul>
							</div>
							<div>
								<h4 className="font-semibold mb-2">バックエンド</h4>
								<ul className="space-y-1 text-muted-foreground">
									<li>• Google Cloud Platform</li>
									<li>• Cloud Firestore</li>
									<li>• NextAuth.js (Discord)</li>
								</ul>
							</div>
						</div>
					</CardContent>
				</Card>

				{/* お問い合わせ・更新履歴 */}
				<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
					<Card>
						<CardHeader>
							<CardTitle>お問い合わせ</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="text-sm text-muted-foreground mb-4">
								技術的な問題やご要望は下記からお願いします。
							</p>
							<p className="text-xs text-muted-foreground mb-4">
								（返信をお約束するものではありません）
							</p>
							<Button variant="outline" size="sm" asChild>
								<Link href="/contact">お問い合わせページ</Link>
							</Button>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Github className="h-5 w-5" />
								更新履歴
							</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="text-sm text-muted-foreground mb-4">
								最新の変更はGitHubで確認できます。
							</p>
							<Button variant="outline" size="sm" asChild>
								<a
									href="https://github.com/your-repo"
									target="_blank"
									rel="noopener noreferrer"
									className="flex items-center gap-2"
								>
									<ExternalLink className="h-4 w-4" />
									GitHub
								</a>
							</Button>
						</CardContent>
					</Card>
				</div>

				{/* フッター */}
				<div className="text-center pt-8 border-t">
					<p className="text-sm text-muted-foreground">
						最終更新: 2025年6月 • 個人運営のファンサイトです
					</p>
				</div>
			</div>
		</div>
	);
}
