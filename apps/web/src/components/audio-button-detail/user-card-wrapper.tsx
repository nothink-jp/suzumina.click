import { Badge } from "@suzumina.click/ui/components/ui/badge";
import { Button } from "@suzumina.click/ui/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@suzumina.click/ui/components/ui/card";
import { Award, TrendingUp, User } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { getUserByDiscordId } from "@/lib/user-firestore";

interface UserCardWrapperProps {
	createdBy: string;
	createdByName: string;
}

export async function UserCardWrapper({ createdBy, createdByName }: UserCardWrapperProps) {
	try {
		const user = await getUserByDiscordId(createdBy);

		if (!user) {
			return (
				<Card className="bg-card/80 backdrop-blur-sm shadow-lg border-0">
					<CardHeader className="pb-3">
						<CardTitle className="text-lg flex items-center gap-2">
							<User className="h-5 w-5 text-suzuka-600" />
							作成者
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="flex items-start gap-3">
							{/* フォールバック アバター */}
							<div className="w-12 h-12 rounded-full bg-suzuka-100 flex items-center justify-center shrink-0">
								<User className="h-6 w-6 text-suzuka-600" />
							</div>

							{/* ユーザー情報 */}
							<div className="space-y-1 flex-1">
								<h3 className="font-medium text-foreground">{createdByName}</h3>
								<p className="text-xs text-muted-foreground">ボタン作成者</p>
							</div>
						</div>
					</CardContent>
				</Card>
			);
		}

		// 正常なユーザー情報表示
		return (
			<Card className="bg-card/80 backdrop-blur-sm shadow-lg border-0">
				<CardHeader className="pb-3">
					<CardTitle className="text-lg flex items-center gap-2">
						<User className="h-5 w-5 text-suzuka-600" />
						作成者
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-4">
						{/* ユーザープロフィール */}
						<div className="flex items-start gap-3">
							{/* アバター */}
							<div className="w-12 h-12 rounded-full overflow-hidden shrink-0">
								{user.avatarUrl ? (
									<Image
										src={user.avatarUrl}
										alt={user.displayName}
										className="w-full h-full object-cover"
										width={48}
										height={48}
										unoptimized
									/>
								) : (
									<div className="w-full h-full bg-suzuka-100 flex items-center justify-center">
										<User className="h-6 w-6 text-suzuka-600" />
									</div>
								)}
							</div>

							{/* ユーザー情報 */}
							<div className="space-y-1 flex-1">
								<h3 className="font-medium text-foreground">{user.displayName}</h3>
								<p className="text-xs text-muted-foreground">{user.memberSince}</p>
								{user.role && user.role !== "member" && (
									<Badge variant="secondary" className="text-xs">
										{user.role === "admin"
											? "管理者"
											: user.role === "moderator"
												? "モデレーター"
												: user.role}
									</Badge>
								)}
							</div>
						</div>

						{/* 統計情報 */}
						{user.showStatistics && (
							<div className="grid grid-cols-2 gap-3">
								<div className="text-center p-2 bg-suzuka-50 rounded-lg">
									<div className="flex items-center justify-center mb-1">
										<Award className="h-3 w-3 text-suzuka-600" />
									</div>
									<div className="text-sm font-bold text-suzuka-700">
										{user.audioButtonsCount?.toLocaleString() || 0}
									</div>
									<div className="text-xs text-suzuka-600">ボタン</div>
								</div>
								<div className="text-center p-2 bg-minase-50 rounded-lg">
									<div className="flex items-center justify-center mb-1">
										<TrendingUp className="h-3 w-3 text-minase-600" />
									</div>
									<div className="text-sm font-bold text-minase-700">
										{user.totalPlayCount?.toLocaleString() || 0}
									</div>
									<div className="text-xs text-minase-600">再生数</div>
								</div>
							</div>
						)}

						{/* プロフィールボタン */}
						<Button variant="outline" size="sm" asChild className="w-full">
							<Link href={`/users/${user.discordId}`}>プロフィールを見る</Link>
						</Button>
					</div>
				</CardContent>
			</Card>
		);
	} catch (_error) {
		// エラー時もフォールバック表示
		return (
			<Card className="bg-card/80 backdrop-blur-sm shadow-lg border-0">
				<CardHeader className="pb-3">
					<CardTitle className="text-lg flex items-center gap-2">
						<User className="h-5 w-5 text-suzuka-600" />
						作成者
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="flex items-start gap-3">
						<div className="w-12 h-12 rounded-full bg-suzuka-100 flex items-center justify-center shrink-0">
							<User className="h-6 w-6 text-suzuka-600" />
						</div>
						<div className="space-y-1 flex-1">
							<h3 className="font-medium text-foreground">{createdByName}</h3>
							<p className="text-xs text-muted-foreground">ボタン作成者</p>
							<p className="text-xs text-amber-600">※ ユーザー情報の取得に失敗しました</p>
						</div>
					</div>
				</CardContent>
			</Card>
		);
	}
}
