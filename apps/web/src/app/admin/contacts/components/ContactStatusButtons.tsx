"use client";

import { Button } from "@suzumina.click/ui/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@suzumina.click/ui/components/ui/dialog";
import { Label } from "@suzumina.click/ui/components/ui/label";
import { Textarea } from "@suzumina.click/ui/components/ui/textarea";
import { AlertCircle, CheckCircle, Edit, Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteContact, updateContactStatus } from "../actions";

type ContactStatus = "new" | "reviewing" | "resolved";

interface ContactStatusButtonsProps {
	contactId: string;
	currentStatus: ContactStatus;
	subject: string;
}

export function ContactStatusButtons({
	contactId,
	currentStatus,
	subject,
}: ContactStatusButtonsProps) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const [dialogOpen, setDialogOpen] = useState(false);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [adminNote, setAdminNote] = useState("");
	const adminNoteId = useId();

	const handleStatusUpdate = (newStatus: ContactStatus) => {
		startTransition(async () => {
			const result = await updateContactStatus(contactId, newStatus, adminNote);

			if (result.success) {
				toast.success(`ステータスを「${getStatusDisplayName(newStatus)}」に更新しました`);
				setDialogOpen(false);
				setAdminNote("");
				router.refresh();
			} else {
				toast.error(result.error || "更新に失敗しました");
			}
		});
	};

	const handleDelete = () => {
		startTransition(async () => {
			const result = await deleteContact(contactId);

			if (result.success) {
				toast.success("お問い合わせを削除しました");
				setDeleteDialogOpen(false);
				router.push("/admin/contacts");
			} else {
				toast.error(result.error || "削除に失敗しました");
			}
		});
	};

	const getStatusDisplayName = (status: ContactStatus): string => {
		switch (status) {
			case "new":
				return "新規";
			case "reviewing":
				return "確認中";
			case "resolved":
				return "対応済み";
		}
	};

	return (
		<div className="flex gap-2">
			{/* 新規 → 確認中 */}
			{currentStatus === "new" && (
				<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
					<DialogTrigger asChild>
						<Button variant="secondary" className="flex items-center gap-2" disabled={isPending}>
							{isPending ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								<Edit className="h-4 w-4" />
							)}
							確認中にする
						</Button>
					</DialogTrigger>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>ステータスを「確認中」に変更</DialogTitle>
							<DialogDescription>
								このお問い合わせのステータスを確認中に変更します。必要に応じてメモを追加できます。
							</DialogDescription>
						</DialogHeader>
						<div className="space-y-4">
							<div>
								<Label htmlFor={adminNoteId}>管理者メモ（任意）</Label>
								<Textarea
									id={adminNoteId}
									placeholder="対応内容や注意事項を記録..."
									value={adminNote}
									onChange={(e) => setAdminNote(e.target.value)}
								/>
							</div>
						</div>
						<DialogFooter>
							<Button variant="outline" onClick={() => setDialogOpen(false)}>
								キャンセル
							</Button>
							<Button onClick={() => handleStatusUpdate("reviewing")} disabled={isPending}>
								{isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
								確認中にする
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			)}

			{/* 確認中 → 対応済み */}
			{currentStatus === "reviewing" && (
				<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
					<DialogTrigger asChild>
						<Button variant="default" className="flex items-center gap-2" disabled={isPending}>
							{isPending ? (
								<Loader2 className="h-4 w-4 animate-spin" />
							) : (
								<CheckCircle className="h-4 w-4" />
							)}
							対応済みにする
						</Button>
					</DialogTrigger>
					<DialogContent>
						<DialogHeader>
							<DialogTitle>ステータスを「対応済み」に変更</DialogTitle>
							<DialogDescription>
								このお問い合わせの対応が完了しました。対応内容を記録してください。
							</DialogDescription>
						</DialogHeader>
						<div className="space-y-4">
							<div>
								<Label htmlFor={adminNoteId}>対応内容（推奨）</Label>
								<Textarea
									id={adminNoteId}
									placeholder="どのような対応を行ったかを記録..."
									value={adminNote}
									onChange={(e) => setAdminNote(e.target.value)}
								/>
							</div>
						</div>
						<DialogFooter>
							<Button variant="outline" onClick={() => setDialogOpen(false)}>
								キャンセル
							</Button>
							<Button onClick={() => handleStatusUpdate("resolved")} disabled={isPending}>
								{isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
								対応済みにする
							</Button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			)}

			{/* 対応済み → 再オープン */}
			{currentStatus === "resolved" && (
				<Button
					variant="outline"
					className="flex items-center gap-2"
					onClick={() => handleStatusUpdate("reviewing")}
					disabled={isPending}
				>
					{isPending ? (
						<Loader2 className="h-4 w-4 animate-spin" />
					) : (
						<AlertCircle className="h-4 w-4" />
					)}
					再オープン
				</Button>
			)}

			{/* 削除ボタン */}
			<Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<DialogTrigger asChild>
					<Button variant="destructive" className="flex items-center gap-2" disabled={isPending}>
						{isPending ? (
							<Loader2 className="h-4 w-4 animate-spin" />
						) : (
							<Trash2 className="h-4 w-4" />
						)}
						削除
					</Button>
				</DialogTrigger>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>お問い合わせを削除</DialogTitle>
						<DialogDescription>
							この操作は元に戻すことができません。本当に削除しますか？
						</DialogDescription>
					</DialogHeader>
					<div className="p-4 bg-muted rounded">
						<p className="text-sm">
							<strong>件名:</strong> {subject}
						</p>
					</div>
					<DialogFooter>
						<Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
							キャンセル
						</Button>
						<Button variant="destructive" onClick={handleDelete} disabled={isPending}>
							{isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
							削除する
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
