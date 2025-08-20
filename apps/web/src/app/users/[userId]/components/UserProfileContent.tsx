"use client";

import type { AudioButtonPlainObject, FrontendUserData } from "@suzumina.click/shared-types";
import { Badge } from "@suzumina.click/ui/components/ui/badge";
import { Button } from "@suzumina.click/ui/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@suzumina.click/ui/components/ui/card";
import {
	Calendar,
	Eye,
	EyeOff,
	Heart,
	Music,
	Play,
	Settings,
	Shield,
	TrendingUp,
	User,
	Users,
	Volume2,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { AudioButtonWithPlayCount } from "@/components/audio/audio-button-with-play-count";

interface UserProfileContentProps {
	user: FrontendUserData;
	audioButtons: AudioButtonPlainObject[];
	audioButtonsCount: number;
	totalPlayCount: number;
	isOwnProfile: boolean;
	favoritesCount?: number;
	initialLikeDislikeStatuses?: Record<string, { isLiked: boolean; isDisliked: boolean }>;
}

// Helper components to reduce complexity
function UserAvatar({ user }: { user: FrontendUserData }) {
	return (
		<div className="relative">
			{user.avatarUrl ? (
				<Image
					src={user.avatarUrl}
					alt={`${user.displayName}のアバター`}
					width={120}
					height={120}
					className="rounded-full border-4 border-white shadow-lg"
				/>
			) : (
				<div className="w-30 h-30 rounded-full bg-gradient-to-r from-suzuka-500 to-minase-500 flex items-center justify-center border-4 border-white shadow-lg">
					<User className="w-12 h-12 text-white" />
				</div>
			)}
			<div className="absolute -bottom-2 -right-2 bg-white rounded-full p-2 shadow-md">
				{user.isPublicProfile ? (
					<Eye className="w-4 h-4 text-green-600" />
				) : (
					<EyeOff className="w-4 h-4 text-gray-600" />
				)}
			</div>
		</div>
	);
}

function UserHeader({ user, isOwnProfile }: { user: FrontendUserData; isOwnProfile: boolean }) {
	return (
		<div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
			<div className="flex-1">
				<h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
					{user.displayName}
					{user.isFamilyMember && (
						<Badge
							variant="default"
							className="bg-purple-100 text-purple-700 hover:bg-purple-200 text-xs"
						>
							<span className="mr-1">👨‍👩‍👧‍👦</span>
							すずみなふぁみりー
						</Badge>
					)}
					{user.role === "admin" && (
						<Badge variant="secondary" className="text-xs">
							<Shield className="w-3 h-3 mr-1" />
							管理者
						</Badge>
					)}
				</h1>
				<p className="text-muted-foreground">@{user.username}</p>
			</div>
			<div className="flex gap-2">
				{isOwnProfile && (
					<Button variant="outline" size="sm" asChild>
						<Link href="/settings">
							<Settings className="w-4 h-4 mr-2" />
							設定
						</Link>
					</Button>
				)}
			</div>
		</div>
	);
}

function AudioButtonsList({
	audioButtons,
	user,
	isOwnProfile,
	initialLikeDislikeStatuses = {},
}: {
	audioButtons: AudioButtonPlainObject[];
	user: FrontendUserData;
	isOwnProfile: boolean;
	initialLikeDislikeStatuses?: Record<string, { isLiked: boolean; isDisliked: boolean }>;
}) {
	if (audioButtons.length === 0) {
		return (
			<Card>
				<CardContent className="p-12 text-center">
					<Volume2 className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
					<h3 className="text-lg font-semibold mb-2">音声ボタンがありません</h3>
					<p className="text-muted-foreground mb-4">
						{isOwnProfile
							? "まだ音声ボタンを作成していません。動画ページから音声ボタンを作成してみましょう。"
							: `${user.displayName}さんはまだ公開している音声ボタンがありません。`}
					</p>
					{isOwnProfile && (
						<Button asChild>
							<Link href="/videos">動画を見る</Link>
						</Button>
					)}
				</CardContent>
			</Card>
		);
	}

	return (
		<>
			<div className="flex flex-wrap gap-3 items-start">
				{audioButtons.map((button) => {
					const likeDislikeStatus = initialLikeDislikeStatuses[button.id];
					return (
						<AudioButtonWithPlayCount
							key={button.id}
							audioButton={button}
							showFavorite={true}
							maxTitleLength={50}
							className="shadow-sm hover:shadow-md transition-all duration-200"
							initialIsLiked={likeDislikeStatus?.isLiked || false}
							initialIsDisliked={likeDislikeStatus?.isDisliked || false}
						/>
					);
				})}
			</div>
			{audioButtons.length >= 20 && (
				<div className="text-center mt-8">
					<Button variant="outline">もっと見る</Button>
				</div>
			)}
		</>
	);
}

export function UserProfileContent({
	user,
	audioButtons,
	audioButtonsCount,
	totalPlayCount,
	isOwnProfile,
	favoritesCount = 0,
	initialLikeDislikeStatuses = {},
}: UserProfileContentProps) {
	const [selectedTab, setSelectedTab] = useState<"buttons" | "stats" | "favorites">("buttons");
	const averagePlays = audioButtonsCount > 0 ? Math.round(totalPlayCount / audioButtonsCount) : 0;

	return (
		<div className="min-h-screen bg-gradient-to-br from-suzuka-50/30 to-minase-50/30">
			<div className="container mx-auto px-4 py-8 max-w-6xl">
				<Card className="mb-8 overflow-hidden">
					<div className="bg-gradient-to-r from-suzuka-500/10 to-minase-500/10 p-6">
						<div className="flex flex-col md:flex-row items-start md:items-center gap-6">
							<UserAvatar user={user} />
							<div className="flex-1">
								<UserHeader user={user} isOwnProfile={isOwnProfile} />
								<div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
									<div className="flex items-center gap-1">
										<Calendar className="w-4 h-4" />
										<span>{user.memberSince}</span>
									</div>
									<div className="flex items-center gap-1">
										<Users className="w-4 h-4" />
										<span>最終ログイン: {user.lastActiveText}</span>
									</div>
									{user.isPublicProfile ? (
										<Badge variant="outline" className="text-xs">
											<Eye className="w-3 h-3 mr-1" />
											公開プロフィール
										</Badge>
									) : (
										<Badge variant="secondary" className="text-xs">
											<EyeOff className="w-3 h-3 mr-1" />
											非公開プロフィール
										</Badge>
									)}
								</div>
							</div>
						</div>
					</div>
					<CardContent className="p-6">
						<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
							<div className="text-center">
								<div className="text-2xl font-bold text-suzuka-600">{audioButtonsCount}</div>
								<div className="text-sm text-muted-foreground">作成ボタン</div>
							</div>
							<div className="text-center">
								<div className="text-2xl font-bold text-minase-600">
									{totalPlayCount.toLocaleString()}
								</div>
								<div className="text-sm text-muted-foreground">総再生数</div>
							</div>
							<div className="text-center">
								<div className="text-2xl font-bold text-suzuka-600">{averagePlays}</div>
								<div className="text-sm text-muted-foreground">平均再生数</div>
							</div>
							<div className="text-center">
								<div className="text-2xl font-bold text-minase-600">{favoritesCount || 0}</div>
								<div className="text-sm text-muted-foreground">お気に入り</div>
							</div>
						</div>
					</CardContent>
				</Card>

				<div className="flex gap-2 mb-6">
					<Button
						variant={selectedTab === "buttons" ? "default" : "ghost"}
						onClick={() => setSelectedTab("buttons")}
						className="flex items-center gap-2"
					>
						<Music className="w-4 h-4" />
						音声ボタン ({audioButtons.length})
					</Button>
					<Button
						variant={selectedTab === "stats" ? "default" : "ghost"}
						onClick={() => setSelectedTab("stats")}
						className="flex items-center gap-2"
					>
						<TrendingUp className="w-4 h-4" />
						統計情報
					</Button>
					{isOwnProfile && (
						<Button
							variant={selectedTab === "favorites" ? "default" : "ghost"}
							onClick={() => setSelectedTab("favorites")}
							className="flex items-center gap-2"
						>
							<Heart className="w-4 h-4" />
							お気に入り ({favoritesCount})
						</Button>
					)}
				</div>

				{selectedTab === "buttons" && (
					<AudioButtonsList
						audioButtons={audioButtons}
						user={user}
						isOwnProfile={isOwnProfile}
						initialLikeDislikeStatuses={initialLikeDislikeStatuses}
					/>
				)}

				{selectedTab === "favorites" && (
					<Card>
						<CardContent className="p-12 text-center">
							<Heart className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
							<h3 className="text-lg font-semibold mb-2">お気に入り機能</h3>
							<p className="text-muted-foreground mb-4">
								お気に入りに登録した音声ボタンを管理できます。
							</p>
							<Button asChild>
								<Link href="/favorites">お気に入り一覧を見る</Link>
							</Button>
						</CardContent>
					</Card>
				)}

				{selectedTab === "stats" && (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<Music className="w-5 h-5 text-suzuka-500" />
									作成統計
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="flex justify-between">
									<span>総ボタン数</span>
									<span className="font-semibold">{audioButtonsCount}</span>
								</div>
								<div className="flex justify-between">
									<span>公開ボタン</span>
									<span className="font-semibold">{audioButtons.length}</span>
								</div>
								<div className="flex justify-between">
									<span>非公開ボタン</span>
									<span className="font-semibold">{audioButtonsCount - audioButtons.length}</span>
								</div>
							</CardContent>
						</Card>
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<Play className="w-5 h-5 text-minase-500" />
									再生統計
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="flex justify-between">
									<span>総再生数</span>
									<span className="font-semibold">{totalPlayCount.toLocaleString()}</span>
								</div>
								<div className="flex justify-between">
									<span>平均再生数</span>
									<span className="font-semibold">{averagePlays}</span>
								</div>
								<div className="flex justify-between">
									<span>最高再生数</span>
									<span className="font-semibold">
										{audioButtons.length > 0
											? Math.max(...audioButtons.map((b) => b.stats.playCount)).toLocaleString()
											: 0}
									</span>
								</div>
							</CardContent>
						</Card>
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-2">
									<TrendingUp className="w-5 h-5 text-suzuka-500" />
									アクティビティ
								</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="flex justify-between">
									<span>参加日</span>
									<span className="font-semibold">{user.memberSince}</span>
								</div>
								<div className="flex justify-between">
									<span>最終ログイン</span>
									<span className="font-semibold">{user.lastActiveText}</span>
								</div>
								<div className="flex justify-between">
									<span>プロフィール</span>
									<Badge variant={user.isPublicProfile ? "default" : "secondary"}>
										{user.isPublicProfile ? "公開" : "非公開"}
									</Badge>
								</div>
							</CardContent>
						</Card>
					</div>
				)}
			</div>
		</div>
	);
}
