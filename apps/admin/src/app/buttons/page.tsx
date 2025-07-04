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
	ChevronLeft,
	ChevronRight,
	ExternalLink,
	Heart,
	Music,
	Play,
	ThumbsUp,
	User,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ButtonActionsCell } from "@/components/ButtonActionsCell";
import { auth } from "@/lib/auth";
import { getFirestore } from "@/lib/firestore";

// 音声ボタンデータの型定義
interface AudioButton {
	id: string;
	title: string;
	youtubeVideoId: string;
	startTime: number;
	endTime: number;
	createdBy: string;
	createdAt: string;
	playCount: number;
	likeCount: number;
	favoriteCount: number;
	isPublic: boolean;
	creatorName?: string;
}

// 作成者名を取得するヘルパー関数
async function getCreatorName(
	firestore: ReturnType<typeof getFirestore>,
	createdBy: string,
): Promise<string> {
	if (!createdBy) return "Unknown";

	try {
		const userDoc = await firestore.collection("users").doc(createdBy).get();
		if (userDoc.exists) {
			const userData = userDoc.data();
			return userData?.displayName || userData?.username || "Unknown";
		}
	} catch {
		// ユーザー情報取得失敗時はUnknownを返す
	}
	return "Unknown";
}

// 音声ボタンデータを変換するヘルパー関数
function createAudioButtonData(
	doc: FirebaseFirestore.QueryDocumentSnapshot,
	creatorName: string,
): AudioButton {
	const data = doc.data();
	return {
		id: doc.id,
		title: data.title || "無題",
		youtubeVideoId: data.youtubeVideoId || "",
		startTime: data.startTime || 0,
		endTime: data.endTime || 0,
		createdBy: data.createdBy || "",
		createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
		playCount: data.playCount || 0,
		likeCount: data.likeCount || 0,
		favoriteCount: data.favoriteCount || 0,
		isPublic: data.isPublic !== false,
		creatorName,
	};
}

// 音声ボタン一覧取得関数（ページネーション対応）
async function getAudioButtons(
	page = 1,
	limit = 100,
): Promise<{
	buttons: AudioButton[];
	totalCount: number;
	currentPage: number;
	totalPages: number;
	hasNext: boolean;
	hasPrev: boolean;
}> {
	try {
		const firestore = getFirestore();

		// 総件数を取得
		const totalSnap = await firestore.collection("audioButtons").get();
		const totalCount = totalSnap.size;

		// ページング計算
		const offset = (page - 1) * limit;
		const totalPages = Math.ceil(totalCount / limit);

		// ページ範囲チェック
		const currentPage = Math.max(1, Math.min(page, totalPages));
		const actualOffset = (currentPage - 1) * limit;

		// データ取得（createdAtでソート）
		const buttonsSnap = await firestore
			.collection("audioButtons")
			.orderBy("createdAt", "desc")
			.offset(actualOffset)
			.limit(limit)
			.get();

		const buttons: AudioButton[] = [];

		for (const doc of buttonsSnap.docs) {
			const data = doc.data();
			const creatorName = await getCreatorName(firestore, data.createdBy);
			buttons.push(createAudioButtonData(doc, creatorName));
		}

		return {
			buttons,
			totalCount,
			currentPage,
			totalPages,
			hasNext: currentPage < totalPages,
			hasPrev: currentPage > 1,
		};
	} catch (_error) {
		return {
			buttons: [],
			totalCount: 0,
			currentPage: 1,
			totalPages: 1,
			hasNext: false,
			hasPrev: false,
		};
	}
}

// 時間フォーマット関数
function formatTime(seconds: number): string {
	const mins = Math.floor(seconds / 60);
	const secs = Math.floor(seconds % 60);
	return `${mins}:${secs.toString().padStart(2, "0")}`;
}

interface ButtonsPageProps {
	searchParams: Promise<{
		page?: string;
	}>;
}

export default async function ButtonsPage({ searchParams }: ButtonsPageProps) {
	const session = await auth();

	if (!session?.user?.isAdmin) {
		redirect("/login");
	}

	// ページ番号を取得
	const params = await searchParams;
	const currentPage = Math.max(1, Number.parseInt(params.page || "1", 10));

	const result = await getAudioButtons(currentPage, 100);
	const { buttons, totalCount, totalPages, hasNext, hasPrev } = result;

	// 統計計算
	const stats = {
		total: totalCount,
		public: buttons.filter((b) => b.isPublic).length,
		private: buttons.filter((b) => !b.isPublic).length,
		totalPlays: buttons.reduce((sum, b) => sum + b.playCount, 0),
		totalLikes: buttons.reduce((sum, b) => sum + b.likeCount, 0),
		totalFavorites: buttons.reduce((sum, b) => sum + b.favoriteCount, 0),
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
				<div>
					<h1 className="text-3xl font-bold text-foreground">音声ボタン管理</h1>
					<p className="text-muted-foreground mt-1">ユーザー作成音声ボタンの管理・統計</p>
				</div>
			</div>

			{/* 統計カード */}
			<div className="grid grid-cols-2 md:grid-cols-6 gap-4">
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium flex items-center gap-2">
							<Music className="h-4 w-4" />
							総ボタン数
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{stats.total}</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium">公開</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-green-600">{stats.public}</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium">非公開</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-muted-foreground">{stats.private}</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium">総再生数</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-blue-600">{stats.totalPlays}</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium">総いいね</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-pink-600">{stats.totalLikes}</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium">お気に入り</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-yellow-600">{stats.totalFavorites}</div>
					</CardContent>
				</Card>
			</div>

			{/* 音声ボタンテーブル */}
			<Card>
				<CardHeader>
					<CardTitle>音声ボタン一覧</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="rounded-md border overflow-x-auto">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead className="min-w-[200px]">タイトル</TableHead>
									<TableHead className="min-w-[120px] hidden sm:table-cell">作成者</TableHead>
									<TableHead className="min-w-[100px] hidden md:table-cell">動画ID</TableHead>
									<TableHead className="min-w-[100px] hidden lg:table-cell">時間範囲</TableHead>
									<TableHead className="min-w-[80px] hidden lg:table-cell">統計</TableHead>
									<TableHead className="min-w-[80px]">ステータス</TableHead>
									<TableHead className="min-w-[100px] hidden md:table-cell">作成日</TableHead>
									<TableHead className="text-right min-w-[100px]">操作</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{buttons.map((button) => (
									<TableRow key={button.id}>
										<TableCell className="font-medium max-w-xs">
											<div className="truncate" title={button.title}>
												{button.title}
											</div>
										</TableCell>
										<TableCell className="hidden sm:table-cell">
											<div className="flex items-center gap-2">
												<User className="h-3 w-3" />
												<span className="text-sm">{button.creatorName}</span>
											</div>
										</TableCell>
										<TableCell className="hidden md:table-cell">
											<div className="flex items-center gap-2">
												<code className="text-xs bg-muted px-1 py-0.5 rounded">
													{button.youtubeVideoId}
												</code>
												<Button variant="ghost" size="sm" asChild>
													<a
														href={`https://www.youtube.com/watch?v=${button.youtubeVideoId}&t=${button.startTime}s`}
														target="_blank"
														rel="noopener noreferrer"
														className="p-1"
													>
														<ExternalLink className="h-3 w-3" />
													</a>
												</Button>
											</div>
										</TableCell>
										<TableCell className="hidden lg:table-cell">
											<div className="text-sm">
												{formatTime(button.startTime)} - {formatTime(button.endTime)}
											</div>
										</TableCell>
										<TableCell className="hidden lg:table-cell">
											<div className="flex gap-2 text-xs">
												<div className="flex items-center gap-1">
													<Play className="h-3 w-3" />
													{button.playCount}
												</div>
												<div className="flex items-center gap-1">
													<ThumbsUp className="h-3 w-3" />
													{button.likeCount}
												</div>
												<div className="flex items-center gap-1">
													<Heart className="h-3 w-3" />
													{button.favoriteCount}
												</div>
											</div>
										</TableCell>
										<TableCell>
											{button.isPublic ? (
												<Badge variant="outline" className="text-green-600 border-green-600">
													公開
												</Badge>
											) : (
												<Badge variant="secondary">非公開</Badge>
											)}
										</TableCell>
										<TableCell className="text-sm hidden md:table-cell">
											{new Date(button.createdAt).toLocaleDateString("ja-JP")}
										</TableCell>
										<TableCell className="text-right">
											<ButtonActionsCell button={button} />
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>

					{buttons.length === 0 && (
						<div className="text-center py-8 text-muted-foreground">音声ボタンが見つかりません</div>
					)}

					{/* ページネーション */}
					{totalPages > 1 && (
						<div className="flex items-center justify-between px-2 py-4 mt-4">
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
										<Link href={`/buttons?page=${currentPage - 1}`}>
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
										<Link href={`/buttons?page=${currentPage + 1}`}>
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
