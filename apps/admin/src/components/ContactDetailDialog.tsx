"use client";

import { Badge } from "@suzumina.click/ui/components/ui/badge";
import { Button } from "@suzumina.click/ui/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@suzumina.click/ui/components/ui/dialog";
import { Label } from "@suzumina.click/ui/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@suzumina.click/ui/components/ui/select";
import { Textarea } from "@suzumina.click/ui/components/ui/textarea";
import { Eye, MessageSquare } from "lucide-react";
import { useState } from "react";
import { showToast } from "@/lib/toast";

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

interface ContactDetailDialogProps {
	contact: Contact;
	onUpdate: () => void;
	triggerIcon?: "eye" | "message";
}

export function ContactDetailDialog({
	contact,
	onUpdate,
	triggerIcon = "eye",
}: ContactDetailDialogProps) {
	const [open, setOpen] = useState(false);
	const [loading, setLoading] = useState(false);
	const [formData, setFormData] = useState({
		status: contact.status,
		priority: contact.priority,
		adminNote: contact.adminNote || "",
	});

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);

		try {
			const response = await fetch(`/api/admin/contacts/${contact.id}`, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(formData),
			});

			const result = await response.json();

			if (result.success) {
				showToast.success("お問い合わせ情報を更新しました");
				setOpen(false);
				onUpdate();
			} else {
				showToast.error(`エラー: ${result.error}`);
			}
		} catch (_error) {
			showToast.error("更新に失敗しました");
		} finally {
			setLoading(false);
		}
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

	const triggerButton =
		triggerIcon === "message" ? (
			<Button variant="outline" size="sm">
				<MessageSquare className="h-4 w-4 mr-1" />
				返信
			</Button>
		) : (
			<Button variant="outline" size="sm">
				<Eye className="h-4 w-4 mr-1" />
				詳細
			</Button>
		);

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>{triggerButton}</DialogTrigger>
			<DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>お問い合わせ詳細</DialogTitle>
				</DialogHeader>
				<div className="space-y-6">
					{/* お問い合わせ情報 */}
					<div className="space-y-4 p-4 bg-gray-50 rounded-lg">
						<div className="flex items-center justify-between">
							<div>
								<h3 className="text-lg font-semibold">{contact.subject}</h3>
								<p className="text-sm text-gray-600">
									{contact.name} ({contact.email})
								</p>
							</div>
							<div className="flex space-x-2">
								{getStatusBadge(contact.status)}
								{getPriorityBadge(contact.priority)}
							</div>
						</div>
						<div>
							<Label className="text-sm font-medium">メッセージ</Label>
							<div className="mt-1 p-3 bg-white border rounded-md">
								<p className="whitespace-pre-wrap text-sm">{contact.message}</p>
							</div>
						</div>
						<div className="text-xs text-gray-500">
							受信日時: {new Date(contact.createdAt).toLocaleString("ja-JP")}
						</div>
					</div>

					{/* 管理者操作フォーム */}
					<form onSubmit={handleSubmit} className="space-y-4">
						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label htmlFor="status">ステータス</Label>
								<Select
									value={formData.status}
									onValueChange={(value: "new" | "reviewing" | "resolved") =>
										setFormData({ ...formData, status: value })
									}
								>
									<SelectTrigger>
										<SelectValue placeholder="ステータスを選択" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="new">新規</SelectItem>
										<SelectItem value="reviewing">確認中</SelectItem>
										<SelectItem value="resolved">対応済み</SelectItem>
									</SelectContent>
								</Select>
							</div>

							<div className="space-y-2">
								<Label htmlFor="priority">優先度</Label>
								<Select
									value={formData.priority}
									onValueChange={(value: "low" | "medium" | "high") =>
										setFormData({ ...formData, priority: value })
									}
								>
									<SelectTrigger>
										<SelectValue placeholder="優先度を選択" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="low">低</SelectItem>
										<SelectItem value="medium">中</SelectItem>
										<SelectItem value="high">高</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>

						<div className="space-y-2">
							<Label htmlFor="adminNote">管理者メモ</Label>
							<Textarea
								id="adminNote"
								value={formData.adminNote}
								onChange={(e) => setFormData({ ...formData, adminNote: e.target.value })}
								placeholder="内部メモや対応履歴を記録..."
								rows={4}
							/>
						</div>

						<div className="flex justify-end space-x-2 pt-4">
							<Button
								type="button"
								variant="outline"
								onClick={() => setOpen(false)}
								disabled={loading}
							>
								キャンセル
							</Button>
							<Button type="submit" disabled={loading}>
								{loading ? "更新中..." : "更新"}
							</Button>
						</div>
					</form>
				</div>
			</DialogContent>
		</Dialog>
	);
}
