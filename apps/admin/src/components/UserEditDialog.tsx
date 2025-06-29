"use client";

import { Button } from "@suzumina.click/ui/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@suzumina.click/ui/components/ui/dialog";
import { Input } from "@suzumina.click/ui/components/ui/input";
import { Label } from "@suzumina.click/ui/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@suzumina.click/ui/components/ui/select";
import { Switch } from "@suzumina.click/ui/components/ui/switch";
import { Edit } from "lucide-react";
import { useState } from "react";
import { showToast } from "@/lib/toast";

interface User {
	id: string;
	discordId: string;
	username: string;
	displayName: string;
	role: string;
	isActive: boolean;
	createdAt: string;
}

interface UserEditDialogProps {
	user: User;
	onUpdate: () => void;
}

export function UserEditDialog({ user, onUpdate }: UserEditDialogProps) {
	const [open, setOpen] = useState(false);
	const [loading, setLoading] = useState(false);
	const [formData, setFormData] = useState({
		role: user.role,
		isActive: user.isActive,
	});

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);

		try {
			const response = await fetch(`/api/admin/users/${user.id}`, {
				method: "PUT",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(formData),
			});

			const result = await response.json();

			if (result.success) {
				showToast.success("ユーザー情報を更新しました");
				setOpen(false);
				onUpdate();
			} else {
				showToast.error(`エラー: ${result.error}`);
			}
		} catch (error) {
			showToast.error("更新に失敗しました");
			console.error("Update error:", error);
		} finally {
			setLoading(false);
		}
	};

	const handleRoleChange = (value: string) => {
		setFormData({ ...formData, role: value });
	};

	const handleActiveChange = (checked: boolean) => {
		setFormData({ ...formData, isActive: checked });
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button variant="outline" size="sm">
					<Edit className="h-4 w-4 mr-1" />
					編集
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle>ユーザー編集</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="username">ユーザー名</Label>
						<Input id="username" value={user.username} disabled className="bg-gray-50" />
					</div>

					<div className="space-y-2">
						<Label htmlFor="displayName">表示名</Label>
						<Input id="displayName" value={user.displayName} disabled className="bg-gray-50" />
					</div>

					<div className="space-y-2">
						<Label htmlFor="discordId">Discord ID</Label>
						<Input id="discordId" value={user.discordId} disabled className="bg-gray-50" />
					</div>

					<div className="space-y-2">
						<Label htmlFor="role">ロール</Label>
						<Select value={formData.role} onValueChange={handleRoleChange}>
							<SelectTrigger>
								<SelectValue placeholder="ロールを選択" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="member">Member</SelectItem>
								<SelectItem value="moderator">Moderator</SelectItem>
								<SelectItem value="admin">Admin</SelectItem>
							</SelectContent>
						</Select>
					</div>

					<div className="flex items-center space-x-2">
						<Switch
							id="isActive"
							checked={formData.isActive}
							onCheckedChange={handleActiveChange}
						/>
						<Label htmlFor="isActive">アクティブ</Label>
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
			</DialogContent>
		</Dialog>
	);
}
