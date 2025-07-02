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
import { ArrowLeft, BookOpen, Calendar, DollarSign, Star, Tag } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { RefreshButton } from "@/components/RefreshButton";
import { WorkActionsCell } from "@/components/WorkActionsCell";
import { auth } from "@/lib/auth";
import { getFirestore } from "@/lib/firestore";

// 作品データの型定義
interface WorkData {
	id: string;
	workId: string;
	title: string;
	circle: string;
	price: number;
	saleDate: string;
	description: string;
	thumbnailUrl: string;
	highResImageUrl?: string;
	tags: string[];
	rating: number;
	reviewCount: number;
	lastUpdated: string;
	isOnSale: boolean;
}

// 作品一覧取得関数
async function getWorks(): Promise<WorkData[]> {
	try {
		const firestore = getFirestore();
		const worksSnap = await firestore
			.collection("dlsiteWorks")
			.orderBy("saleDate", "desc")
			.limit(100)
			.get();

		if (worksSnap.docs.length > 0) {
		}

		return worksSnap.docs.map((doc) => {
			const data = doc.data();
			return {
				id: doc.id,
				workId: data.workId || doc.id,
				title: data.title || "無題",
				circle: data.circle || "不明",
				price: data.price || 0,
				saleDate: data.saleDate?.toDate?.()?.toISOString() || new Date().toISOString(),
				description: data.description || "",
				thumbnailUrl: data.thumbnailUrl || "",
				highResImageUrl: data.highResImageUrl,
				tags: data.tags || [],
				rating: data.rating || 0,
				reviewCount: data.reviewCount || 0,
				lastUpdated: data.lastUpdated?.toDate?.()?.toISOString() || new Date().toISOString(),
				isOnSale: data.isOnSale !== false,
			};
		});
	} catch (_error) {
		return [];
	}
}

// 価格フォーマット
function formatPrice(price: number): string {
	return `¥${price.toLocaleString()}`;
}

// 評価表示
function formatRating(rating: number): string {
	return rating > 0 ? rating.toFixed(1) : "未評価";
}

export default async function WorksPage() {
	const session = await auth();

	if (!session?.user?.isAdmin) {
		redirect("/login");
	}

	const works = await getWorks();

	// 統計計算
	const stats = {
		total: works.length,
		onSale: works.filter((w) => w.isOnSale).length,
		totalValue: works.reduce((sum, w) => sum + w.price, 0),
		averagePrice: works.length > 0 ? works.reduce((sum, w) => sum + w.price, 0) / works.length : 0,
		latestWork: works[0]?.saleDate,
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
					<h1 className="text-3xl font-bold text-foreground">作品管理</h1>
					<p className="text-muted-foreground mt-1">DLsite作品データの管理・監視</p>
				</div>
				<RefreshButton type="works" />
			</div>

			{/* 統計カード */}
			<div className="grid grid-cols-2 md:grid-cols-5 gap-4">
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium flex items-center gap-2">
							<BookOpen className="h-4 w-4" />
							総作品数
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{stats.total}</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium">販売中</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-green-600">{stats.onSale}</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium">総額</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-lg font-bold text-blue-600">{formatPrice(stats.totalValue)}</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium">平均価格</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-lg font-bold">{formatPrice(Math.round(stats.averagePrice))}</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium">最新作品</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-sm">
							{stats.latestWork ? new Date(stats.latestWork).toLocaleDateString("ja-JP") : "なし"}
						</div>
					</CardContent>
				</Card>
			</div>

			{/* 作品テーブル */}
			<Card>
				<CardHeader>
					<CardTitle>作品一覧</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="rounded-md border">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>作品</TableHead>
									<TableHead>サークル</TableHead>
									<TableHead>価格</TableHead>
									<TableHead>評価</TableHead>
									<TableHead>タグ</TableHead>
									<TableHead>販売日</TableHead>
									<TableHead>ステータス</TableHead>
									<TableHead className="text-right">操作</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{works.map((work) => (
									<TableRow key={work.id}>
										<TableCell className="font-medium">
											<div className="flex items-start gap-3 max-w-md">
												{(work.highResImageUrl || work.thumbnailUrl) && (
													<Image
														src={work.highResImageUrl || work.thumbnailUrl}
														alt=""
														width={64}
														height={80}
														className="w-16 h-20 rounded object-cover flex-shrink-0"
														unoptimized
													/>
												)}
												<div className="min-w-0 flex-1">
													<div className="font-semibold line-clamp-2 text-sm">{work.title}</div>
													<code className="text-xs text-muted-foreground">{work.workId}</code>
												</div>
											</div>
										</TableCell>
										<TableCell>
											<div className="text-sm">{work.circle}</div>
										</TableCell>
										<TableCell>
											<div className="flex items-center gap-1 font-medium">
												<DollarSign className="h-3 w-3" />
												{formatPrice(work.price)}
											</div>
										</TableCell>
										<TableCell>
											<div className="flex items-center gap-1 text-sm">
												<Star className="h-3 w-3 text-yellow-500" />
												{formatRating(work.rating)}
												<span className="text-muted-foreground">({work.reviewCount})</span>
											</div>
										</TableCell>
										<TableCell>
											<div className="flex flex-wrap gap-1 max-w-xs">
												{work.tags.slice(0, 3).map((tag) => (
													<Badge key={tag} variant="outline" className="text-xs">
														<Tag className="h-2 w-2 mr-1" />
														{tag}
													</Badge>
												))}
												{work.tags.length > 3 && (
													<Badge variant="secondary" className="text-xs">
														+{work.tags.length - 3}
													</Badge>
												)}
											</div>
										</TableCell>
										<TableCell>
											<div className="flex items-center gap-1 text-sm">
												<Calendar className="h-3 w-3" />
												{new Date(work.saleDate).toLocaleDateString("ja-JP")}
											</div>
										</TableCell>
										<TableCell>
											{work.isOnSale ? (
												<Badge variant="outline" className="text-green-600 border-green-600">
													販売中
												</Badge>
											) : (
												<Badge variant="secondary">販売終了</Badge>
											)}
										</TableCell>
										<TableCell className="text-right">
											<WorkActionsCell work={work} />
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>

					{works.length === 0 && (
						<div className="text-center py-8 text-muted-foreground">作品データが見つかりません</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
