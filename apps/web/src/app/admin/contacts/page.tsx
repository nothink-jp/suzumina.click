import type { FrontendContactData } from "@suzumina.click/shared-types";
import { Button } from "@suzumina.click/ui/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@suzumina.click/ui/components/ui/card";
import { Input } from "@suzumina.click/ui/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@suzumina.click/ui/components/ui/select";
import { Download, Filter, Search } from "lucide-react";
import { getFirestore } from "@/lib/firestore";
import { ContactList } from "./components/ContactList";

type ContactsPageProps = {
	searchParams: Promise<{
		status?: string;
		category?: string;
		search?: string;
		page?: string;
	}>;
};

async function getContacts({
	status,
	category,
	search,
	page = "1",
}: {
	status?: string;
	category?: string;
	search?: string;
	page?: string;
}) {
	try {
		const firestore = getFirestore();
		let query = firestore.collection("contacts");

		// ステータスフィルター
		if (status && status !== "all") {
			// biome-ignore lint/suspicious/noExplicitAny: Firestore query typing issue
			query = query.where("status", "==", status) as any;
		}

		// カテゴリフィルター
		if (category && category !== "all") {
			// biome-ignore lint/suspicious/noExplicitAny: Firestore query typing issue
			query = query.where("category", "==", category) as any;
		}

		// 作成日順でソート（新しい順）
		// biome-ignore lint/suspicious/noExplicitAny: Firestore query typing issue
		query = query.orderBy("createdAt", "desc") as any;

		const snapshot = await query.get();

		let contacts = snapshot.docs.map((doc) => {
			const data = doc.data();
			return {
				...data,
				id: doc.id,
			} as FrontendContactData;
		});

		// 検索フィルター（クライアントサイド）
		if (search) {
			const searchLower = search.toLowerCase();
			contacts = contacts.filter(
				(contact) =>
					contact.subject.toLowerCase().includes(searchLower) ||
					contact.content.toLowerCase().includes(searchLower) ||
					contact.email?.toLowerCase().includes(searchLower),
			);
		}

		// ページネーション
		const limit = 20;
		const offset = (Number.parseInt(page) - 1) * limit;
		const paginatedContacts = contacts.slice(offset, offset + limit);

		return {
			contacts: paginatedContacts,
			total: contacts.length,
			hasMore: contacts.length > offset + limit,
		};
	} catch (_error) {
		return {
			contacts: [],
			total: 0,
			hasMore: false,
		};
	}
}

async function getContactStats() {
	try {
		const firestore = getFirestore();
		const snapshot = await firestore.collection("contacts").get();

		const stats = snapshot.docs.reduce(
			(acc, doc) => {
				const status = doc.data().status || "new";
				const category = doc.data().category || "other";

				acc.byStatus[status] = (acc.byStatus[status] || 0) + 1;
				acc.byCategory[category] = (acc.byCategory[category] || 0) + 1;
				acc.total++;

				return acc;
			},
			{
				total: 0,
				byStatus: {} as Record<string, number>,
				byCategory: {} as Record<string, number>,
			},
		);

		return stats;
	} catch (_error) {
		return {
			total: 0,
			byStatus: {},
			byCategory: {},
		};
	}
}

export default async function ContactsAdminPage({ searchParams }: ContactsPageProps) {
	const { status, category, search, page } = await searchParams;

	const [{ contacts, total, hasMore }, stats] = await Promise.all([
		getContacts({ status, category, search, page }),
		getContactStats(),
	]);

	return (
		<div className="p-6 space-y-6">
			{/* ページヘッダー */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold text-foreground">お問い合わせ管理</h1>
					<p className="text-muted-foreground mt-1">全 {stats.total} 件のお問い合わせ</p>
				</div>
				<Button variant="outline" className="flex items-center gap-2">
					<Download className="h-4 w-4" />
					CSVエクスポート
				</Button>
			</div>

			{/* 統計カード */}
			<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
				<Card>
					<CardContent className="p-4">
						<div className="text-center">
							<div className="text-2xl font-bold text-destructive">{stats.byStatus.new || 0}</div>
							<div className="text-sm text-muted-foreground">新規</div>
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="p-4">
						<div className="text-center">
							<div className="text-2xl font-bold text-orange-600">
								{stats.byStatus.reviewing || 0}
							</div>
							<div className="text-sm text-muted-foreground">確認中</div>
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="p-4">
						<div className="text-center">
							<div className="text-2xl font-bold text-green-600">
								{stats.byStatus.resolved || 0}
							</div>
							<div className="text-sm text-muted-foreground">対応済み</div>
						</div>
					</CardContent>
				</Card>
				<Card>
					<CardContent className="p-4">
						<div className="text-center">
							<div className="text-2xl font-bold text-suzuka-600">{stats.total}</div>
							<div className="text-sm text-muted-foreground">総件数</div>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* フィルター・検索 */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Filter className="h-5 w-5" />
						フィルター・検索
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
						{/* ステータスフィルター */}
						<div>
							<label htmlFor="status-select" className="text-sm font-medium">
								ステータス
							</label>
							<Select defaultValue={status || "all"}>
								{/* biome-ignore lint/nursery/useUniqueElementIds: Server component with unique page context */}
								<SelectTrigger id="status-select">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">すべて</SelectItem>
									<SelectItem value="new">新規</SelectItem>
									<SelectItem value="reviewing">確認中</SelectItem>
									<SelectItem value="resolved">対応済み</SelectItem>
								</SelectContent>
							</Select>
						</div>

						{/* カテゴリフィルター */}
						<div>
							<label htmlFor="category-select" className="text-sm font-medium">
								カテゴリ
							</label>
							<Select defaultValue={category || "all"}>
								{/* biome-ignore lint/nursery/useUniqueElementIds: Server component with unique page context */}
								<SelectTrigger id="category-select">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="all">すべて</SelectItem>
									<SelectItem value="bug">🐛 バグ報告</SelectItem>
									<SelectItem value="feature">💡 機能要望</SelectItem>
									<SelectItem value="usage">❓ 使い方</SelectItem>
									<SelectItem value="other">📢 その他</SelectItem>
								</SelectContent>
							</Select>
						</div>

						{/* 検索 */}
						<div className="md:col-span-2">
							<label htmlFor="search-input" className="text-sm font-medium">
								検索
							</label>
							<div className="relative">
								<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
								{/* biome-ignore lint/nursery/useUniqueElementIds: Server component with unique page context */}
								<Input
									id="search-input"
									placeholder="件名、内容、メールアドレスで検索..."
									defaultValue={search || ""}
									className="pl-10"
								/>
							</div>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* お問い合わせ一覧 */}
			<Card>
				<CardHeader>
					<CardTitle>お問い合わせ一覧</CardTitle>
				</CardHeader>
				<CardContent>
					<ContactList contacts={contacts} />

					{/* ページネーション */}
					{total > 20 && (
						<div className="flex justify-center mt-6">
							<div className="flex items-center gap-2">
								<Button variant="outline" size="sm" disabled={page === "1"}>
									前のページ
								</Button>
								<span className="text-sm text-muted-foreground">{page || "1"} ページ</span>
								<Button variant="outline" size="sm" disabled={!hasMore}>
									次のページ
								</Button>
							</div>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
