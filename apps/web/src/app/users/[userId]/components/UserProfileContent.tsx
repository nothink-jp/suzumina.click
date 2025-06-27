"use client";

import type { FrontendAudioButtonData, FrontendUserData } from "@suzumina.click/shared-types";
import { SimpleAudioButton } from "@suzumina.click/ui/components/custom/simple-audio-button";
import { Badge } from "@suzumina.click/ui/components/ui/badge";
import { Button } from "@suzumina.click/ui/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@suzumina.click/ui/components/ui/card";
import {
	Calendar,
	Eye,
	EyeOff,
	Music,
	Play,
	Settings,
	Shield,
	Star,
	TrendingUp,
	User,
	Users,
	Volume2,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

interface UserProfileContentProps {
	user: FrontendUserData;
	audioButtons: FrontendAudioButtonData[];
	isOwnProfile: boolean;
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
			<div>
				<h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
					{user.displayName}
					{user.role === "admin" && (
						<Badge variant="secondary" className="text-xs">
							<Shield className="w-3 h-3 mr-1" />
							管理者
						</Badge>
					)}
				</h1>
				<p className="text-muted-foreground">@{user.username}</p>
			</div>
			{isOwnProfile && (
				<Button variant="outline" size="sm" asChild>
					<Link href="/settings/profile">
						<Settings className="w-4 h-4 mr-2" />
						設定
					</Link>
				</Button>
			)}
		</div>
	);
}

function AudioButtonsList({
	audioButtons,
	user,
	isOwnProfile,
}: {
	audioButtons: FrontendAudioButtonData[];
	user: FrontendUserData;
	isOwnProfile: boolean;
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
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				{audioButtons.map((button) => (
					<Card key={button.id} className="hover:shadow-md transition-shadow">
						<CardContent className="p-4">
							<div className="space-y-3">
								<div>
									<h3 className="font-semibold line-clamp-2">{button.title}</h3>
									<p className="text-sm text-muted-foreground">
										{button.durationText} • {button.relativeTimeText}
									</p>
								</div>
								<SimpleAudioButton audioButton={button} className="w-full" />
								<div className="flex items-center justify-between text-xs text-muted-foreground">
									<div className="flex items-center gap-1">
										<Play className="w-3 h-3" />
										<span>{button.playCount}回再生</span>
									</div>
									<div className="flex items-center gap-1">
										<Star className="w-3 h-3" />
										<span>{button.likeCount}</span>
									</div>
								</div>
								<div className="pt-2 border-t">
									<Link
										href={`/videos/${button.sourceVideoId}`}
										className="text-xs text-suzuka-600 hover:text-suzuka-700 line-clamp-1"
									>
										{button.sourceVideoTitle}
									</Link>
								</div>
							</div>
						</CardContent>
					</Card>
				))}
			</div>
			{audioButtons.length >= 20 && (
				<div className="text-center mt-8">
					<Button variant="outline">もっと見る</Button>
				</div>
			)}
		</>
	);
}

export function UserProfileContent({ user, audioButtons, isOwnProfile }: UserProfileContentProps) {
	const [selectedTab, setSelectedTab] = useState<"buttons" | "stats">("buttons");
	const averagePlays =
		user.audioButtonsCount > 0 ? Math.round(user.totalPlayCount / user.audioButtonsCount) : 0;

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
								<div className="text-2xl font-bold text-suzuka-600">{user.audioButtonsCount}</div>
								<div className="text-sm text-muted-foreground">作成ボタン</div>
							</div>
							<div className="text-center">
								<div className="text-2xl font-bold text-minase-600">
									{user.totalPlayCount.toLocaleString()}
								</div>
								<div className="text-sm text-muted-foreground">総再生数</div>
							</div>
							<div className="text-center">
								<div className="text-2xl font-bold text-suzuka-600">{averagePlays}</div>
								<div className="text-sm text-muted-foreground">平均再生数</div>
							</div>
							<div className="text-center">
								<div className="text-2xl font-bold text-minase-600">-</div>
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
				</div>

				{selectedTab === "buttons" && (
					<AudioButtonsList audioButtons={audioButtons} user={user} isOwnProfile={isOwnProfile} />
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
									<span className="font-semibold">{user.audioButtonsCount}</span>
								</div>
								<div className="flex justify-between">
									<span>公開ボタン</span>
									<span className="font-semibold">{audioButtons.length}</span>
								</div>
								<div className="flex justify-between">
									<span>非公開ボタン</span>
									<span className="font-semibold">
										{user.audioButtonsCount - audioButtons.length}
									</span>
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
									<span className="font-semibold">{user.totalPlayCount.toLocaleString()}</span>
								</div>
								<div className="flex justify-between">
									<span>平均再生数</span>
									<span className="font-semibold">{averagePlays}</span>
								</div>
								<div className="flex justify-between">
									<span>最高再生数</span>
									<span className="font-semibold">
										{audioButtons.length > 0
											? Math.max(...audioButtons.map((b) => b.playCount)).toLocaleString()
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
