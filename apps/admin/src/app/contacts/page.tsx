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
	AlertCircle,
	ArrowLeft,
	CheckCircle,
	Clock,
	Mail,
	MessageSquare,
	User,
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

// お問い合わせ一覧取得関数
async function getContacts(): Promise<ContactData[]> {
	try {
		const firestore = getFirestore();
		const contactsSnap = await firestore
			.collection("contacts")
			.orderBy("createdAt", "desc")
			.limit(100)
			.get();

		return contactsSnap.docs.map((doc) => {
			const data = doc.data();
			return {
				id: doc.id,
				name: data.name || "匿名",
				email: data.email || "",
				subject: data.subject || "件名なし",
				message: data.message || "",
				status: data.status || "new",
				createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
				updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
				priority: data.priority || "medium",
			};
		});
	} catch (_error) {
		return [];
	}
}

// ステータスバッジ
function getStatusBadge(status: string) {
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
function getPriorityBadge(priority: string) {
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

export default async function ContactsPage() {
	const session = await auth();

	if (!session?.user?.isAdmin) {
		redirect("/login");
	}

	const contacts = await getContacts();

	// 統計計算
	const stats = {
		total: contacts.length,
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
				</CardContent>
			</Card>
		</div>
	);
}
