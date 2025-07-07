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
	BookOpen,
	Calendar,
	ChevronLeft,
	ChevronRight,
	DollarSign,
	Star,
	Tag,
} from "lucide-react";
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
	price: {
		current: number;
		currency: string;
		original?: number;
		discount?: number;
	};
	saleDate: string;
	description: string;
	thumbnailUrl: string;
	highResImageUrl?: string;
	tags: string[];
	rating: {
		stars: number;
		count: number;
	};
	lastUpdated: string;
	isOnSale: boolean;
}

// 作品一覧取得関数（ページネーション対応）
async function getWorks(
	page = 1,
	limit = 100,
): Promise<{
	works: WorkData[];
	totalCount: number;
	currentPage: number;
	totalPages: number;
	hasNext: boolean;
	hasPrev: boolean;
}> {
	try {
		const firestore = getFirestore();

		// 総件数を取得
		const totalSnap = await firestore.collection("dlsiteWorks").get();
		const totalCount = totalSnap.size;

		// ページング計算
		const _offset = (page - 1) * limit;
		const totalPages = Math.ceil(totalCount / limit);

		// ページ範囲チェック
		const currentPage = Math.max(1, Math.min(page, totalPages));
		const actualOffset = (currentPage - 1) * limit;

		// データ取得（ソートなしで安全に取得）
		const worksSnap = await firestore
			.collection("dlsiteWorks")
			.offset(actualOffset)
			.limit(limit)
			.get();

		const works = worksSnap.docs.map((doc) => {
			const data = doc.data();
			return {
				id: doc.id,
				workId: data.workId || doc.id,
				title: data.title || "無題",
				circle: data.circle || "不明",
				price: {
					current: data.price?.current || 0,
					currency: data.price?.currency || "JPY",
					original: data.price?.original,
					discount: data.price?.discount,
				},
				saleDate:
					typeof data.saleDate === "string"
						? data.saleDate
						: data.saleDate?.toDate?.()?.toISOString() || new Date().toISOString(),
				description: data.description || "",
				thumbnailUrl: data.thumbnailUrl || "",
				highResImageUrl: data.highResImageUrl,
				tags: Array.isArray(data.tags) ? data.tags : [],
				rating: {
					stars: data.rating?.stars || 0,
					count: data.rating?.count || 0,
				},
				lastUpdated:
					typeof data.lastUpdated === "string"
						? data.lastUpdated
						: data.lastUpdated?.toDate?.()?.toISOString() || new Date().toISOString(),
				isOnSale: data.isOnSale !== false,
			};
		});

		return {
			works,
			totalCount,
			currentPage,
			totalPages,
			hasNext: currentPage < totalPages,
			hasPrev: currentPage > 1,
		};
	} catch (_error) {
		return {
			works: [],
			totalCount: 0,
			currentPage: 1,
			totalPages: 1,
			hasNext: false,
			hasPrev: false,
		};
	}
}

// 価格フォーマット
function formatPrice(price: {
	current: number;
	currency: string;
	original?: number;
	discount?: number;
}): string {
	if (!price || typeof price.current !== "number" || Number.isNaN(price.current)) {
		return "¥0";
	}
	return `¥${price.current.toLocaleString()}`;
}

// 統計計算関数（全データを対象）
async function calculateStats() {
	try {
		const firestore = getFirestore();
		const allWorksSnap = await firestore.collection("dlsiteWorks").get();

		const allWorks = allWorksSnap.docs.map((doc) => {
			const data = doc.data();
			return {
				price: typeof data.price === "number" ? data.price : 0,
				isOnSale: data.isOnSale !== false,
				saleDate: data.saleDate?.toDate?.()?.toISOString() || new Date().toISOString(),
			};
		});

		const total = allWorks.length;
		const onSale = allWorks.filter((w) => w.isOnSale).length;
		const totalValue = allWorks.reduce((sum, w) => sum + w.price, 0);
		const averagePrice = total > 0 ? totalValue / total : 0;
		const latestWork =
			allWorks.length > 0
				? allWorks.reduce((latest, work) =>
						new Date(work.saleDate) > new Date(latest.saleDate) ? work : latest,
					).saleDate
				: null;

		return {
			total,
			onSale,
			totalValue,
			averagePrice,
			latestWork,
		};
	} catch (_error) {
		return {
			total: 0,
			onSale: 0,
			totalValue: 0,
			averagePrice: 0,
			latestWork: null,
		};
	}
}

// 評価表示
function formatRating(rating: { stars: number; count: number }): string {
	return rating.stars > 0 ? rating.stars.toFixed(1) : "未評価";
}

interface WorksPageProps {
	searchParams: Promise<{
		page?: string;
	}>;
}

export default async function WorksPage({ searchParams }: WorksPageProps) {
	const session = await auth();

	if (!session?.user?.isAdmin) {
		redirect("/login");
	}

	// ページ番号を取得
	const params = await searchParams;
	const currentPage = Math.max(1, Number.parseInt(params.page || "1", 10));

	const result = await getWorks(currentPage, 100);
	const { works, totalCount, totalPages, hasNext, hasPrev } = result;

	// 統計計算（全データから計算）
	const stats = await calculateStats();

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
						<div className="text-lg font-bold text-blue-600">
							¥{stats.totalValue.toLocaleString()}
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium">平均価格</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-lg font-bold">
							¥{Math.round(stats.averagePrice).toLocaleString()}
						</div>
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
												<span className="text-muted-foreground">({work.rating.count})</span>
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
										<Link href={`/works?page=${currentPage - 1}`}>
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
										<Link href={`/works?page=${currentPage + 1}`}>
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
