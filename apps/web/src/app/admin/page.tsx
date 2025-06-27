import { Badge } from "@suzumina.click/ui/components/ui/badge";
import { Button } from "@suzumina.click/ui/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@suzumina.click/ui/components/ui/card";
import {
	AlertCircle,
	BookOpen,
	Clock,
	MessageSquare,
	Music,
	Play,
	TrendingUp,
	Users,
} from "lucide-react";
import Link from "next/link";
import { getFirestore } from "@/lib/firestore";

// 統計データ取得関数
async function getAdminStats() {
	try {
		const firestore = getFirestore();

		// 並列でデータ取得
		const [usersSnap, videosSnap, worksSnap, buttonsSnap, contactsSnap] = await Promise.all([
			firestore.collection("users").get(),
			firestore.collection("youtubeVideos").get(),
			firestore.collection("dlsiteWorks").get(),
			firestore.collection("audioButtons").get(),
			firestore.collection("contacts").get(),
		]);

		// お問い合わせのステータス別集計
		const contactsByStatus = contactsSnap.docs.reduce(
			(acc, doc) => {
				const status = doc.data().status || "new";
				acc[status] = (acc[status] || 0) + 1;
				return acc;
			},
			{} as Record<string, number>,
		);

		return {
			users: {
				total: usersSnap.size,
				admins: usersSnap.docs.filter((doc) => doc.data().role === "admin").length,
			},
			videos: {
				total: videosSnap.size,
			},
			works: {
				total: worksSnap.size,
			},
			buttons: {
				total: buttonsSnap.size,
			},
			contacts: {
				total: contactsSnap.size,
				new: contactsByStatus.new || 0,
				reviewing: contactsByStatus.reviewing || 0,
				resolved: contactsByStatus.resolved || 0,
			},
		};
	} catch {
		return null;
	}
}

export default async function AdminDashboard() {
	const stats = await getAdminStats();

	if (!stats) {
		return (
			<div className="p-6">
				<Card className="border-destructive">
					<CardContent className="p-6 text-center">
						<AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
						<p className="text-destructive">統計データの取得に失敗しました</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="p-6 space-y-6">
			{/* ページヘッダー */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold text-foreground">管理者ダッシュボード</h1>
					<p className="text-muted-foreground mt-1">suzumina.click システム概要</p>
				</div>
				<Badge variant="outline" className="bg-gradient-to-r from-suzuka-50 to-minase-50">
					<Clock className="h-3 w-3 mr-1" />
					{new Date().toLocaleString("ja-JP")}
				</Badge>
			</div>

			{/* 統計カード */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				{/* ユーザー統計 */}
				<Card className="hover:shadow-md transition-shadow">
					<CardHeader className="pb-2">
						<CardTitle className="flex items-center gap-2 text-sm font-medium">
							<Users className="h-4 w-4 text-suzuka-500" />
							ユーザー管理
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-2">
							<div className="flex items-baseline gap-2">
								<span className="text-2xl font-bold">{stats.users.total}</span>
								<span className="text-sm text-muted-foreground">総ユーザー</span>
							</div>
							<div className="flex items-center gap-2">
								<Badge variant="secondary" className="text-xs">
									管理者: {stats.users.admins}名
								</Badge>
							</div>
							<Button variant="outline" size="sm" asChild className="w-full mt-3">
								<Link href="/admin/users">ユーザー管理を開く</Link>
							</Button>
						</div>
					</CardContent>
				</Card>

				{/* 動画統計 */}
				<Card className="hover:shadow-md transition-shadow">
					<CardHeader className="pb-2">
						<CardTitle className="flex items-center gap-2 text-sm font-medium">
							<Play className="h-4 w-4 text-suzuka-500" />
							動画管理
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-2">
							<div className="flex items-baseline gap-2">
								<span className="text-2xl font-bold">{stats.videos.total}</span>
								<span className="text-sm text-muted-foreground">YouTube動画</span>
							</div>
							<div className="flex items-center gap-2">
								<TrendingUp className="h-3 w-3 text-green-500" />
								<span className="text-xs text-muted-foreground">自動収集中</span>
							</div>
							<Button variant="outline" size="sm" asChild className="w-full mt-3">
								<Link href="/admin/videos">動画管理を開く</Link>
							</Button>
						</div>
					</CardContent>
				</Card>

				{/* 作品統計 */}
				<Card className="hover:shadow-md transition-shadow">
					<CardHeader className="pb-2">
						<CardTitle className="flex items-center gap-2 text-sm font-medium">
							<BookOpen className="h-4 w-4 text-suzuka-500" />
							作品管理
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-2">
							<div className="flex items-baseline gap-2">
								<span className="text-2xl font-bold">{stats.works.total}</span>
								<span className="text-sm text-muted-foreground">DLsite作品</span>
							</div>
							<div className="flex items-center gap-2">
								<TrendingUp className="h-3 w-3 text-green-500" />
								<span className="text-xs text-muted-foreground">自動収集中</span>
							</div>
							<Button variant="outline" size="sm" asChild className="w-full mt-3">
								<Link href="/admin/works">作品管理を開く</Link>
							</Button>
						</div>
					</CardContent>
				</Card>

				{/* 音声ボタン統計 */}
				<Card className="hover:shadow-md transition-shadow">
					<CardHeader className="pb-2">
						<CardTitle className="flex items-center gap-2 text-sm font-medium">
							<Music className="h-4 w-4 text-suzuka-500" />
							音声ボタン管理
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-2">
							<div className="flex items-baseline gap-2">
								<span className="text-2xl font-bold">{stats.buttons.total}</span>
								<span className="text-sm text-muted-foreground">音声ボタン</span>
							</div>
							<div className="flex items-center gap-2">
								<span className="text-xs text-muted-foreground">ユーザー作成コンテンツ</span>
							</div>
							<Button variant="outline" size="sm" asChild className="w-full mt-3">
								<Link href="/admin/buttons">音声ボタン管理を開く</Link>
							</Button>
						</div>
					</CardContent>
				</Card>

				{/* お問い合わせ統計 */}
				<Card className="hover:shadow-md transition-shadow">
					<CardHeader className="pb-2">
						<CardTitle className="flex items-center gap-2 text-sm font-medium">
							<MessageSquare className="h-4 w-4 text-suzuka-500" />
							お問い合わせ管理
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-2">
							<div className="flex items-baseline gap-2">
								<span className="text-2xl font-bold">{stats.contacts.total}</span>
								<span className="text-sm text-muted-foreground">総件数</span>
							</div>
							<div className="space-y-1">
								<div className="flex justify-between text-xs">
									<span>新規</span>
									<Badge variant="destructive" className="text-xs">
										{stats.contacts.new}
									</Badge>
								</div>
								<div className="flex justify-between text-xs">
									<span>確認中</span>
									<Badge variant="secondary" className="text-xs">
										{stats.contacts.reviewing}
									</Badge>
								</div>
								<div className="flex justify-between text-xs">
									<span>対応済み</span>
									<Badge variant="outline" className="text-xs">
										{stats.contacts.resolved}
									</Badge>
								</div>
							</div>
							<Button variant="outline" size="sm" asChild className="w-full mt-3">
								<Link href="/admin/contacts">お問い合わせ管理を開く</Link>
							</Button>
						</div>
					</CardContent>
				</Card>

				{/* システム情報 */}
				<Card className="hover:shadow-md transition-shadow bg-gradient-to-br from-suzuka-50 to-minase-50">
					<CardHeader className="pb-2">
						<CardTitle className="flex items-center gap-2 text-sm font-medium">
							<TrendingUp className="h-4 w-4 text-suzuka-500" />
							システム情報
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-2">
							<div className="text-xs space-y-1">
								<div className="flex justify-between">
									<span>プロジェクト</span>
									<span className="font-mono">suzumina.click</span>
								</div>
								<div className="flex justify-between">
									<span>バージョン</span>
									<span className="font-mono">v0.2.1</span>
								</div>
								<div className="flex justify-between">
									<span>環境</span>
									<Badge variant="outline" className="text-xs">
										{process.env.NODE_ENV}
									</Badge>
								</div>
							</div>
							<div className="pt-2 border-t">
								<p className="text-xs text-muted-foreground">涼花みなせファンコミュニティ</p>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* アクションセクション */}
			<Card>
				<CardHeader>
					<CardTitle>クイックアクション</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
						<Button variant="outline" asChild>
							<Link href="/admin/contacts?status=new" className="flex items-center gap-2">
								<MessageSquare className="h-4 w-4" />
								新規お問い合わせ
							</Link>
						</Button>
						<Button variant="outline" asChild>
							<Link href="/admin/buttons?sort=newest" className="flex items-center gap-2">
								<Music className="h-4 w-4" />
								最新音声ボタン
							</Link>
						</Button>
						<Button variant="outline" asChild>
							<Link href="/admin/users?role=admin" className="flex items-center gap-2">
								<Users className="h-4 w-4" />
								管理者ユーザー
							</Link>
						</Button>
						<Button variant="outline" asChild>
							<Link href="/" className="flex items-center gap-2">
								<TrendingUp className="h-4 w-4" />
								サイトを表示
							</Link>
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
