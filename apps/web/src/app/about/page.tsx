import { Button } from "@suzumina.click/ui/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@suzumina.click/ui/components/ui/card";
import { Heart, Music, Play, Shield } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
	title: "サイトについて",
	description:
		"suzumina.clickは涼花みなせさんのファンコミュニティによる非公式ファンサイトです。YouTube動画の特定場面を再生できるボタン作成・DLsite作品情報のご紹介・ファン同士の交流を目的としています。",
	keywords: [
		"涼花みなせ",
		"ファンサイト",
		"非公式",
		"コミュニティ",
		"YouTube再生",
		"DLsite作品紹介",
	],
	openGraph: {
		title: "サイトについて | すずみなくりっく！",
		description:
			"suzumina.clickは涼花みなせさんのファンコミュニティによる非公式ファンサイトです。YouTube動画の特定場面を再生できるボタン作成・DLsite作品情報のご紹介・ファン同士の交流を目的としています。",
		url: "https://suzumina.click/about",
	},
	alternates: {
		canonical: "/about",
	},
};

export default function AboutPage() {
	return (
		<div className="container mx-auto px-4 py-8 max-w-4xl">
			{/* ページヘッダー */}
			<div className="text-center mb-8">
				<h1 className="text-3xl font-bold text-foreground mb-4">suzumina.click について</h1>
				<p className="text-lg text-muted-foreground">
					涼花みなせさんのファンによる、ファンのための
					<b>非公式</b>
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
								<span className="text-sm">YouTube再生ボタンの作成・共有</span>
							</div>
							<div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
								<Play className="h-5 w-5 text-minase-500" />
								<span className="text-sm">YouTube動画の整理・検索</span>
							</div>
							<div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
								<Play className="h-5 w-5 text-suzuka-500" />
								<span className="text-sm">DLsite作品情報の参照・表示</span>
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
								涼花みなせさんや関係者様とは一切関係ありません
							</p>
						</div>
						<div className="bg-orange-50 p-4 rounded-lg">
							<h4 className="font-semibold text-orange-700 mb-2">ファン活動</h4>
							<p className="text-sm text-muted-foreground">個人が趣味で運営しています</p>
						</div>
						<div className="bg-blue-50 p-4 rounded-lg">
							<h4 className="font-semibold text-blue-700 mb-2">著作権・コンテンツ利用方針</h4>
							<p className="text-sm text-muted-foreground">
								すべての音声・画像の著作権は原著作者に帰属します。本サイトは公開されているコンテンツへの参照・リンクのみを行い、音声・画像データの複製・転載・再配布は一切行いません
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
								<h4 className="font-semibold flex items-center gap-2">
									🎵 YouTube再生ボタン作成・再生
								</h4>
								<p className="text-sm text-muted-foreground">
									YouTube動画の特定場面を参照・再生できるボタンを作成・共有できます（音声ファイルの保存・ダウンロードは一切行いません。YouTube埋め込みプレイヤーを使用）
								</p>
							</div>
							<div className="space-y-2">
								<h4 className="font-semibold flex items-center gap-2">📺 YouTube動画一覧・検索</h4>
								<p className="text-sm text-muted-foreground">
									配信アーカイブや動画を整理して閲覧できます
								</p>
							</div>
							<div className="space-y-2">
								<h4 className="font-semibold flex items-center gap-2">
									🛒 DLsite作品情報の参照・表示
								</h4>
								<p className="text-sm text-muted-foreground">
									涼花みなせさんの音声作品情報を参照・表示。DLsite公式サイトでご購入いただけます
								</p>
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

				{/* お問い合わせ・運営について */}
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
							<CardTitle>サイト運営について</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="text-sm text-muted-foreground mb-4">
								このサイトは個人が趣味で運営しており、継続的な更新や新機能の追加をお約束するものではありません。
							</p>
							<p className="text-xs text-muted-foreground">
								サイトの状況は予告なく変更される場合があります。
							</p>
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
