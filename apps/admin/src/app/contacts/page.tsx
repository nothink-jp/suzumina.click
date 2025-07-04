import { Badge } from "@suzumina.click/ui/components/ui/badge";
import { Button } from "@suzumina.click/ui/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@suzumina.click/ui/components/ui/card";
import {
	AlertCircle,
	ArrowLeft,
	CheckCircle,
	ChevronLeft,
	ChevronRight,
	Clock,
	MessageSquare,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ContactManagementClient } from "@/components/ContactManagementClient";
import { auth } from "@/lib/auth";
import { getFirestore } from "@/lib/firestore";

// お問い合わせデータの型定義
interface ContactData {
	id: string;
	name: string;
	email: string;
	subject: string;
	message: string;
	status: "new" | "reviewing" | "resolved";
	createdAt: string;
	updatedAt: string;
	priority: "low" | "medium" | "high";
}

// お問い合わせ一覧取得関数（ページネーション対応）
async function getContacts(
	page = 1,
	limit = 100,
): Promise<{
	contacts: ContactData[];
	totalCount: number;
	currentPage: number;
	totalPages: number;
	hasNext: boolean;
	hasPrev: boolean;
}> {
	try {
		const firestore = getFirestore();

		// 総件数を取得
		const totalSnap = await firestore.collection("contacts").get();
		const totalCount = totalSnap.size;

		// ページング計算
		const offset = (page - 1) * limit;
		const totalPages = Math.ceil(totalCount / limit);

		// ページ範囲チェック
		const currentPage = Math.max(1, Math.min(page, totalPages));
		const actualOffset = (currentPage - 1) * limit;

		// データ取得（createdAtでソート）
		const contactsSnap = await firestore
			.collection("contacts")
			.orderBy("createdAt", "desc")
			.offset(actualOffset)
			.limit(limit)
			.get();

		const contacts = contactsSnap.docs.map((doc) => {
			const data = doc.data();
			return {
				id: doc.id,
				name: "匿名ユーザー", // お問い合わせフォームでは名前フィールドなし
				email: data.email || "",
				subject: data.subject || "件名なし",
				message: data.content || "", // contentフィールドをmessageとして使用
				status: data.status || "new",
				createdAt:
					typeof data.createdAt === "string"
						? data.createdAt
						: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
				updatedAt:
					typeof data.updatedAt === "string"
						? data.updatedAt
						: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
				priority: data.priority || "medium",
			};
		});

		return {
			contacts,
			totalCount,
			currentPage,
			totalPages,
			hasNext: currentPage < totalPages,
			hasPrev: currentPage > 1,
		};
	} catch (_error) {
		return {
			contacts: [],
			totalCount: 0,
			currentPage: 1,
			totalPages: 1,
			hasNext: false,
			hasPrev: false,
		};
	}
}

// ステータスバッジ
function _getStatusBadge(status: string) {
	switch (status) {
		case "new":
			return (
				<Badge variant="destructive" className="gap-1">
					<AlertCircle className="h-3 w-3" />
					新規
				</Badge>
			);
		case "reviewing":
			return (
				<Badge variant="secondary" className="gap-1">
					<Clock className="h-3 w-3" />
					確認中
				</Badge>
			);
		case "resolved":
			return (
				<Badge variant="outline" className="gap-1 text-green-600 border-green-600">
					<CheckCircle className="h-3 w-3" />
					対応済み
				</Badge>
			);
		default:
			return <Badge variant="outline">{status}</Badge>;
	}
}

// 優先度バッジ
function _getPriorityBadge(priority: string) {
	switch (priority) {
		case "high":
			return <Badge variant="destructive">高</Badge>;
		case "medium":
			return <Badge variant="secondary">中</Badge>;
		case "low":
			return <Badge variant="outline">低</Badge>;
		default:
			return <Badge variant="outline">{priority}</Badge>;
	}
}

interface ContactsPageProps {
	searchParams: Promise<{
		page?: string;
	}>;
}

export default async function ContactsPage({ searchParams }: ContactsPageProps) {
	const session = await auth();

	if (!session?.user?.isAdmin) {
		redirect("/login");
	}

	// ページ番号を取得
	const params = await searchParams;
	const currentPage = Math.max(1, Number.parseInt(params.page || "1", 10));

	const result = await getContacts(currentPage, 100);
	const { contacts, totalCount, totalPages, hasNext, hasPrev } = result;

	// 統計計算
	const stats = {
		total: totalCount,
		new: contacts.filter((c) => c.status === "new").length,
		reviewing: contacts.filter((c) => c.status === "reviewing").length,
		resolved: contacts.filter((c) => c.status === "resolved").length,
		highPriority: contacts.filter((c) => c.priority === "high").length,
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
					<h1 className="text-3xl font-bold text-foreground">お問い合わせ管理</h1>
					<p className="text-muted-foreground mt-1">ユーザーからのお問い合わせ対応・管理</p>
				</div>
			</div>

			{/* 統計カード */}
			<div className="grid grid-cols-2 md:grid-cols-5 gap-4">
				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium flex items-center gap-2">
							<MessageSquare className="h-4 w-4" />
							総件数
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold">{stats.total}</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium">新規</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-destructive">{stats.new}</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium">確認中</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-secondary">{stats.reviewing}</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium">対応済み</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-green-600">{stats.resolved}</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="pb-2">
						<CardTitle className="text-sm font-medium">高優先度</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="text-2xl font-bold text-destructive">{stats.highPriority}</div>
					</CardContent>
				</Card>
			</div>

			{/* お問い合わせテーブル */}
			<Card>
				<CardHeader>
					<CardTitle>お問い合わせ一覧</CardTitle>
				</CardHeader>
				<CardContent>
					<ContactManagementClient initialContacts={contacts} />

					{contacts.length === 0 && (
						<div className="text-center py-8 text-muted-foreground">
							お問い合わせが見つかりません
						</div>
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
										<Link href={`/contacts?page=${currentPage - 1}`}>
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
										<Link href={`/contacts?page=${currentPage + 1}`}>
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
