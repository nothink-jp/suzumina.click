"use client";

import {
	type FrontendContactData,
	getCategoryDisplayName,
	getStatusDisplayName,
} from "@suzumina.click/shared-types";
import { Badge } from "@suzumina.click/ui/components/ui/badge";
import { Button } from "@suzumina.click/ui/components/ui/button";
import { Card, CardContent } from "@suzumina.click/ui/components/ui/card";
import { Clock, ExternalLink, Eye, Mail, MessageSquare, User } from "lucide-react";
import Link from "next/link";

type ContactListProps = {
	contacts: FrontendContactData[];
};

export function ContactList({ contacts }: ContactListProps) {
	if (contacts.length === 0) {
		return (
			<div className="text-center py-8">
				<MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
				<p className="text-muted-foreground">お問い合わせが見つかりませんでした</p>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			{contacts.map((contact) => (
				<Card key={contact.id} className="hover:shadow-md transition-shadow">
					<CardContent className="p-4">
						<div className="flex items-start justify-between gap-4">
							{/* メイン情報 */}
							<div className="flex-1 min-w-0">
								{/* ヘッダー */}
								<div className="flex items-center gap-2 mb-2">
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
									<div className="flex items-center gap-1 text-xs text-muted-foreground">
										<Clock className="h-3 w-3" />
										{new Date(contact.createdAt).toLocaleString("ja-JP")}
									</div>
								</div>

								{/* 件名 */}
								<h3 className="font-semibold text-foreground mb-2 truncate">{contact.subject}</h3>

								{/* 内容プレビュー */}
								<p className="text-sm text-muted-foreground line-clamp-2 mb-3">{contact.content}</p>

								{/* メタ情報 */}
								<div className="flex items-center gap-4 text-xs text-muted-foreground">
									{contact.email && (
										<div className="flex items-center gap-1">
											<Mail className="h-3 w-3" />
											<span className="truncate max-w-[200px]">{contact.email}</span>
										</div>
									)}
									<div className="flex items-center gap-1">
										<User className="h-3 w-3" />
										<span>IP: {contact.ipAddress}</span>
									</div>
								</div>
							</div>

							{/* アクション */}
							<div className="flex flex-col gap-2">
								<Button variant="outline" size="sm" asChild>
									<Link href={`/admin/contacts/${contact.id}`} className="flex items-center gap-2">
										<Eye className="h-3 w-3" />
										詳細
									</Link>
								</Button>

								{contact.status === "new" && (
									<Button variant="secondary" size="sm">
										確認中にする
									</Button>
								)}

								{contact.status === "reviewing" && (
									<Button variant="default" size="sm">
										対応済みにする
									</Button>
								)}
							</div>
						</div>

						{/* 緊急度インジケーター */}
						{contact.category === "bug" && contact.status === "new" && (
							<div className="mt-3 p-2 bg-destructive/10 border border-destructive/20 rounded-md">
								<div className="flex items-center gap-2 text-xs text-destructive">
									<ExternalLink className="h-3 w-3" />
									<span className="font-medium">バグ報告 - 優先対応が必要</span>
								</div>
							</div>
						)}
					</CardContent>
				</Card>
			))}
		</div>
	);
}
