"use client";

import { Badge } from "@suzumina.click/ui/components/ui/badge";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@suzumina.click/ui/components/ui/table";
import { useState } from "react";
import { ContactDeleteDialog } from "@/components/ContactDeleteDialog";
import { ContactDetailDialog } from "@/components/ContactDetailDialog";

interface Contact {
	id: string;
	name: string;
	email: string;
	subject: string;
	message: string;
	status: "new" | "reviewing" | "resolved";
	priority: "low" | "medium" | "high";
	createdAt: string;
	adminNote?: string;
}

interface ContactManagementClientProps {
	initialContacts: Contact[];
}

export function ContactManagementClient({ initialContacts }: ContactManagementClientProps) {
	const [contacts, _setContacts] = useState(initialContacts);

	const refreshContacts = async () => {
		// ページをリロードしてデータを更新
		window.location.reload();
	};

	const getStatusBadge = (status: string) => {
		switch (status) {
			case "new":
				return <Badge className="bg-blue-100 text-blue-700 border-blue-200">新規</Badge>;
			case "reviewing":
				return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">確認中</Badge>;
			case "resolved":
				return <Badge className="bg-green-100 text-green-700 border-green-200">対応済み</Badge>;
			default:
				return <Badge variant="secondary">{status}</Badge>;
		}
	};

	const getPriorityBadge = (priority: string) => {
		switch (priority) {
			case "high":
				return <Badge variant="destructive">高</Badge>;
			case "medium":
				return <Badge className="bg-orange-100 text-orange-700 border-orange-200">中</Badge>;
			case "low":
				return <Badge variant="secondary">低</Badge>;
			default:
				return <Badge variant="secondary">{priority}</Badge>;
		}
	};

	return (
		<div className="rounded-md border">
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>件名</TableHead>
						<TableHead>差出人</TableHead>
						<TableHead>ステータス</TableHead>
						<TableHead>優先度</TableHead>
						<TableHead>受信日時</TableHead>
						<TableHead className="text-right">操作</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{contacts.map((contact) => (
						<TableRow key={contact.id}>
							<TableCell className="font-medium">
								<div className="max-w-xs truncate">{contact.subject}</div>
							</TableCell>
							<TableCell>
								<div>
									<div className="font-medium">{contact.name}</div>
									<div className="text-sm text-muted-foreground">{contact.email}</div>
								</div>
							</TableCell>
							<TableCell>{getStatusBadge(contact.status)}</TableCell>
							<TableCell>{getPriorityBadge(contact.priority)}</TableCell>
							<TableCell className="text-sm">
								{new Date(contact.createdAt).toLocaleString("ja-JP")}
							</TableCell>
							<TableCell className="text-right">
								<div className="flex gap-1 justify-end">
									<ContactDetailDialog
										contact={contact}
										onUpdate={refreshContacts}
										triggerIcon="eye"
									/>
									<ContactDetailDialog
										contact={contact}
										onUpdate={refreshContacts}
										triggerIcon="message"
									/>
									<ContactDeleteDialog contact={contact} onDelete={refreshContacts} />
								</div>
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
}
