import {
	type FrontendContactData,
	getCategoryDisplayName,
	getStatusDisplayName,
} from "@suzumina.click/shared-types";
import { Badge } from "@suzumina.click/ui/components/ui/badge";
import { Button } from "@suzumina.click/ui/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@suzumina.click/ui/components/ui/card";
import { Separator } from "@suzumina.click/ui/components/ui/separator";
import {
	AlertCircle,
	ArrowLeft,
	Clock,
	Edit,
	Globe,
	Mail,
	MessageSquare,
	User,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getFirestore } from "@/lib/firestore";
import { ContactStatusButtons } from "../components/ContactStatusButtons";

type ContactDetailPageProps = {
	params: {
		id: string;
	};
};

async function getContact(id: string): Promise<FrontendContactData | null> {
	try {
		const firestore = getFirestore();
		const doc = await firestore.collection("contacts").doc(id).get();

		if (!doc.exists) {
			return null;
		}

		const data = doc.data();
		return convertToFrontendContact({
			...data,
			id: doc.id,
		});
	} catch (_error) {
		return null;
	}
}

export default async function ContactDetailPage({ params }: ContactDetailPageProps) {
	const contact = await getContact(params.id);

	if (!contact) {
		notFound();
	}

	return (
		<div className="p-6 max-w-4xl mx-auto space-y-6">
			{/* ナビゲーション */}
			<div className="flex items-center gap-4">
				<Button variant="ghost" size="sm" asChild>
					<Link href="/admin/contacts" className="flex items-center gap-2">
						<ArrowLeft className="h-4 w-4" />
						お問い合わせ一覧に戻る
					</Link>
				</Button>
			</div>

			{/* ヘッダー */}
			<div className="space-y-4">
				<div className="flex items-start justify-between gap-4">
					<div>
						<h1 className="text-3xl font-bold text-foreground mb-2">お問い合わせ詳細</h1>
						<div className="flex items-center gap-2">
							<Badge
								variant={
									contact.status === "new"
										? "destructive"
										: contact.status === "reviewing"
											? "secondary"
											: "outline"
								}
							>
								{getStatusDisplayName(contact.status)}
							</Badge>
							<Badge variant="outline">{getCategoryDisplayName(contact.category)}</Badge>
						</div>
					</div>

					{/* ステータス変更ボタン */}
					<ContactStatusButtons
						contactId={contact.id}
						currentStatus={contact.status}
						subject={contact.subject}
					/>
				</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				{/* メインコンテンツ */}
				<div className="lg:col-span-2 space-y-6">
					{/* 件名・内容 */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<MessageSquare className="h-5 w-5" />
								お問い合わせ内容
							</CardTitle>
						</CardHeader>
						<CardContent className="space-y-4">
							<div>
								<h3 className="font-semibold text-lg mb-2">{contact.subject}</h3>
								<Separator />
							</div>
							<div className="prose prose-sm max-w-none">
								<div className="whitespace-pre-wrap bg-muted p-4 rounded-lg">{contact.content}</div>
							</div>
						</CardContent>
					</Card>

					{/* 緊急度アラート */}
					{contact.category === "bug" && contact.status !== "resolved" && (
						<Card className="border-destructive bg-destructive/5">
							<CardContent className="p-4">
								<div className="flex items-center gap-2 text-destructive">
									<AlertCircle className="h-5 w-5" />
									<span className="font-medium">バグ報告 - 優先対応が必要です</span>
								</div>
								<p className="text-sm text-muted-foreground mt-2">
									ユーザー体験に影響する可能性があります。早急な対応をお願いします。
								</p>
							</CardContent>
						</Card>
					)}

					{/* アクション履歴 */}
					<Card>
						<CardHeader>
							<CardTitle>対応履歴</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="space-y-3">
								<div className="flex items-center gap-3">
									<div className="w-2 h-2 bg-suzuka-500 rounded-full" />
									<div className="flex-1">
										<div className="flex items-center justify-between">
											<span className="text-sm font-medium">お問い合わせ受信</span>
											<span className="text-xs text-muted-foreground">
												{new Date(contact.createdAt).toLocaleString("ja-JP")}
											</span>
										</div>
										<p className="text-xs text-muted-foreground">自動受信処理完了</p>
									</div>
								</div>

								{/* ここに将来的にアクション履歴を追加 */}
								<div className="text-center text-sm text-muted-foreground py-4">
									まだ対応履歴はありません
								</div>
							</div>
						</CardContent>
					</Card>
				</div>

				{/* サイドバー */}
				<div className="space-y-6">
					{/* 基本情報 */}
					<Card>
						<CardHeader>
							<CardTitle className="text-base">基本情報</CardTitle>
						</CardHeader>
						<CardContent className="space-y-3">
							<div className="flex items-center gap-2 text-sm">
								<Clock className="h-4 w-4 text-muted-foreground" />
								<div>
									<div className="font-medium">受信日時</div>
									<div className="text-muted-foreground">
										{new Date(contact.createdAt).toLocaleString("ja-JP")}
									</div>
								</div>
							</div>

							{contact.email && (
								<div className="flex items-center gap-2 text-sm">
									<Mail className="h-4 w-4 text-muted-foreground" />
									<div>
										<div className="font-medium">メールアドレス</div>
										<div className="text-muted-foreground break-all">{contact.email}</div>
									</div>
								</div>
							)}

							<div className="flex items-center gap-2 text-sm">
								<User className="h-4 w-4 text-muted-foreground" />
								<div>
									<div className="font-medium">IPアドレス</div>
									<div className="text-muted-foreground font-mono">{contact.ipAddress}</div>
								</div>
							</div>

							<div className="flex items-center gap-2 text-sm">
								<Globe className="h-4 w-4 text-muted-foreground" />
								<div>
									<div className="font-medium">ユーザーエージェント</div>
									<div className="text-muted-foreground text-xs break-all">{contact.userAgent}</div>
								</div>
							</div>
						</CardContent>
					</Card>

					{/* アクション */}
					<Card>
						<CardHeader>
							<CardTitle className="text-base">アクション</CardTitle>
						</CardHeader>
						<CardContent className="space-y-2">
							{contact.email && (
								<Button variant="outline" className="w-full" asChild>
									<a
										href={`mailto:${contact.email}?subject=Re: ${contact.subject}`}
										className="flex items-center gap-2"
									>
										<Mail className="h-4 w-4" />
										メール返信
									</a>
								</Button>
							)}

							<Button variant="outline" className="w-full">
								<Edit className="h-4 w-4 mr-2" />
								メモを追加
							</Button>
						</CardContent>
					</Card>

					{/* カテゴリ別の対応ガイド */}
					<Card>
						<CardHeader>
							<CardTitle className="text-base">対応ガイド</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="text-xs space-y-2">
								{contact.category === "bug" && (
									<div className="space-y-1">
										<div className="font-medium text-destructive">バグ報告対応</div>
										<ul className="text-muted-foreground space-y-1">
											<li>• 再現環境の確認</li>
											<li>• 緊急度の評価</li>
											<li>• 開発チームへの報告</li>
											<li>• 修正予定の連絡</li>
										</ul>
									</div>
								)}
								{contact.category === "feature" && (
									<div className="space-y-1">
										<div className="font-medium text-suzuka-600">機能要望対応</div>
										<ul className="text-muted-foreground space-y-1">
											<li>• 要望の詳細確認</li>
											<li>• 実装可能性の検討</li>
											<li>• 優先度の評価</li>
											<li>• ロードマップの確認</li>
										</ul>
									</div>
								)}
								{contact.category === "usage" && (
									<div className="space-y-1">
										<div className="font-medium text-blue-600">使い方サポート</div>
										<ul className="text-muted-foreground space-y-1">
											<li>• ヘルプページの案内</li>
											<li>• 手順の詳細説明</li>
											<li>• FAQ追加の検討</li>
										</ul>
									</div>
								)}
							</div>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
