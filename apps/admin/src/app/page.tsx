import {
	ListPageContent,
	ListPageGrid,
	ListPageHeader,
	ListPageLayout,
} from "@suzumina.click/ui/components/custom/list-page-layout";
import { Badge } from "@suzumina.click/ui/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@suzumina.click/ui/components/ui/card";
import {
	AlertCircle,
	BookOpen,
	Clock,
	Heart,
	MessageSquare,
	Music,
	Play,
	TrendingUp,
	Users,
} from "lucide-react";
import { redirect } from "next/navigation";
import { StatCard } from "@/components/ui/stat-card";
import { auth } from "@/lib/auth";
import { getFirestore } from "@/lib/firestore";

// 統計データ取得関数
async function getAdminStats() {
	try {
		const firestore = getFirestore();

		// 並列でデータ取得
		const [usersSnap, videosSnap, worksSnap, buttonsSnap, contactsSnap] = await Promise.all([
			firestore.collection("users").get(),
			firestore.collection("videos").get(),
			firestore.collection("dlsiteWorks").get(),
			firestore.collection("audioButtons").get(),
			firestore.collection("contacts").get(),
		]);

		// お気に入り総数を取得
		let totalFavorites = 0;
		for (const userDoc of usersSnap.docs) {
			const favoritesSnap = await firestore
				.collection("users")
				.doc(userDoc.id)
				.collection("favorites")
				.get();
			totalFavorites += favoritesSnap.size;
		}

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
			favorites: {
				total: totalFavorites,
			},
		};
	} catch {
		return null;
	}
}

export default async function AdminDashboard() {
	const session = await auth();

	if (!session?.user?.isAdmin) {
		redirect("/login");
	}

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
		<ListPageLayout>
			<ListPageHeader title="管理者ダッシュボード" description="suzumina.click システム概要">
				<Badge variant="outline" className="bg-gradient-to-r from-suzuka-50 to-minase-50">
					<Clock className="h-3 w-3 mr-1" />
					{new Date().toLocaleString("ja-JP")}
				</Badge>
			</ListPageHeader>

			<ListPageContent>
				{/* 統計カード - モバイル最適化 */}
				<ListPageGrid columns={{ default: 1, sm: 2, lg: 3 }}>
					{/* ユーザー統計 */}
					<StatCard
						title="ユーザー管理"
						icon={Users}
						mainValue={stats.users.total}
						mainLabel="総ユーザー"
						badges={[{ label: "管理者", value: `${stats.users.admins}名`, variant: "secondary" }]}
						actionButton={{
							label: "ユーザー管理を開く",
							href: "/users",
						}}
					/>

					{/* 動画統計 */}
					<StatCard
						title="動画管理"
						icon={Play}
						mainValue={stats.videos.total}
						mainLabel="YouTube動画"
						additionalInfo={
							<>
								<TrendingUp className="h-3 w-3 text-green-500" />
								<span className="text-xs text-muted-foreground">自動収集中</span>
							</>
						}
						actionButton={{
							label: "動画管理を開く",
							href: "/videos",
						}}
					/>

					{/* 作品統計 */}
					<StatCard
						title="作品管理"
						icon={BookOpen}
						mainValue={stats.works.total}
						mainLabel="DLsite作品"
						additionalInfo={
							<>
								<TrendingUp className="h-3 w-3 text-green-500" />
								<span className="text-xs text-muted-foreground">自動収集中</span>
							</>
						}
						actionButton={{
							label: "作品管理を開く",
							href: "/works",
						}}
					/>

					{/* 音声ボタン統計 */}
					<StatCard
						title="音声ボタン管理"
						icon={Music}
						mainValue={stats.buttons.total}
						mainLabel="音声ボタン"
						additionalInfo={
							<span className="text-xs text-muted-foreground">ユーザー作成コンテンツ</span>
						}
						actionButton={{
							label: "音声ボタン管理を開く",
							href: "/buttons",
						}}
					/>

					{/* お気に入り統計 */}
					<StatCard
						title="お気に入り管理"
						icon={Heart}
						iconColor="text-red-500"
						mainValue={stats.favorites.total}
						mainLabel="総お気に入り"
						additionalInfo={
							<span className="text-xs text-muted-foreground">ユーザーのお気に入り音声ボタン</span>
						}
						actionButton={{
							label: "お気に入り管理を開く",
							href: "/favorites",
						}}
					/>

					{/* お問い合わせ統計 */}
					<StatCard
						title="お問い合わせ管理"
						icon={MessageSquare}
						mainValue={stats.contacts.total}
						mainLabel="総件数"
						additionalInfo={
							<div className="space-y-1 w-full">
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
						}
						actionButton={{
							label: "お問い合わせ管理を開く",
							href: "/contacts",
						}}
					/>

					{/* システム情報 */}
					<StatCard
						title="システム情報"
						icon={TrendingUp}
						mainValue="v0.2.2"
						mainLabel="suzumina.click"
						additionalInfo={
							<div className="w-full space-y-2">
								<div className="text-xs space-y-1">
									<div className="flex justify-between">
										<span>プロジェクト</span>
										<span className="font-mono">suzumina.click</span>
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
						}
						className="bg-gradient-to-br from-suzuka-50 to-minase-50"
					/>
				</ListPageGrid>

				{/* 管理者情報 */}
				<Card>
					<CardHeader>
						<CardTitle>管理者情報</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-sm text-muted-foreground">
							<p>
								ログイン管理者: {session.user.name} ({session.user.id})
							</p>
							<p className="mt-1">v0.2.2 | 涼花みなせファンコミュニティ 管理システム</p>
						</div>
					</CardContent>
				</Card>
			</ListPageContent>
		</ListPageLayout>
	);
}
