"use client";

import type { FrontendUserData } from "@suzumina.click/shared-types";
import { Button } from "@suzumina.click/ui/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@suzumina.click/ui/components/ui/card";
import { Label } from "@suzumina.click/ui/components/ui/label";
import { Switch } from "@suzumina.click/ui/components/ui/switch";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updateUserProfile } from "../actions";

interface ProfileSettingsFormProps {
	user: FrontendUserData;
}

export function ProfileSettingsForm({ user }: ProfileSettingsFormProps) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const [isPublicProfile, setIsPublicProfile] = useState(user.isPublicProfile);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		startTransition(async () => {
			try {
				const result = await updateUserProfile({
					isPublicProfile,
				});

				if (result.success) {
					toast.success("プロフィールを更新しました");
					router.push(`/users/${user.discordId}`);
				} else {
					toast.error(result.error || "更新に失敗しました");
				}
			} catch (_error) {
				toast.error("予期しないエラーが発生しました");
			}
		});
	};

	return (
		<form onSubmit={handleSubmit}>
			<Card className="mb-6">
				<CardHeader>
					<CardTitle>基本情報</CardTitle>
					<CardDescription>ユーザー情報の表示設定</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					<div className="space-y-2">
						<Label>表示名</Label>
						<p className="text-lg font-medium">{user.displayName}</p>
						<p className="text-sm text-muted-foreground">
							表示名はDiscordのアカウント名から自動的に設定されます
						</p>
					</div>

					<div className="space-y-2">
						<Label>ユーザー名</Label>
						<p className="text-lg font-medium">@{user.username}</p>
						<p className="text-sm text-muted-foreground">
							ユーザー名はDiscordのユーザー名から自動的に設定されます
						</p>
					</div>

					<div className="space-y-2">
						<Label>Discord ID</Label>
						<p className="text-lg font-mono">{user.discordId}</p>
					</div>

					<div className="space-y-2">
						<Label>メンバーシップステータス</Label>
						<div className="flex items-center gap-2">
							{user.isFamilyMember ? (
								<>
									<span className="inline-flex items-center gap-1.5 rounded-full bg-purple-100 px-3 py-1 text-sm font-semibold text-purple-700">
										<span className="text-base">👨‍👩‍👧‍👦</span>
										すずみなふぁみりー
									</span>
									<span className="text-sm text-muted-foreground">
										1日110個まで音声ボタン作成可能
									</span>
								</>
							) : (
								<>
									<span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-sm font-semibold text-gray-700">
										<span className="text-base">👤</span>
										一般ユーザー
									</span>
									<span className="text-sm text-muted-foreground">
										1日10個まで音声ボタン作成可能
									</span>
								</>
							)}
						</div>
						<p className="text-xs text-muted-foreground">
							※ ci-en支援者は
							<a
								href="https://ci-en.dlsite.com/creator/9805"
								target="_blank"
								rel="noopener noreferrer"
								className="text-blue-600 hover:text-blue-700 underline"
							>
								こちら
							</a>
							からDiscordサーバーに参加できます
						</p>
					</div>
				</CardContent>
			</Card>

			<Card className="mb-6">
				<CardHeader>
					<CardTitle>プライバシー設定</CardTitle>
					<CardDescription>プロフィールの公開範囲を設定</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="flex items-center justify-between space-x-2">
						<Label htmlFor="public-profile" className="flex flex-col space-y-1">
							<span>プロフィールを公開</span>
							<span className="font-normal text-sm text-muted-foreground">
								他のユーザーがあなたのプロフィールページを閲覧できるようになります
							</span>
						</Label>
						<Switch
							id="public-profile"
							checked={isPublicProfile}
							onCheckedChange={setIsPublicProfile}
							disabled={isPending}
						/>
					</div>
				</CardContent>
			</Card>

			<Card className="mb-6">
				<CardHeader>
					<CardTitle>アカウント情報</CardTitle>
					<CardDescription>あなたの登録情報</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="flex justify-between">
						<span className="text-muted-foreground">メンバー登録日</span>
						<span className="font-medium">{user.memberSince}</span>
					</div>
					<div className="flex justify-between">
						<span className="text-muted-foreground">最終ログイン</span>
						<span className="font-medium">{user.lastActiveText}</span>
					</div>
				</CardContent>
			</Card>

			<div className="flex gap-4">
				<Button type="button" variant="outline" asChild>
					<Link href={`/users/${user.discordId}`}>
						<ArrowLeft className="w-4 h-4 mr-2" />
						キャンセル
					</Link>
				</Button>
				<Button type="submit" disabled={isPending}>
					<Save className="w-4 h-4 mr-2" />
					{isPending ? "保存中..." : "変更を保存"}
				</Button>
			</div>
		</form>
	);
}
