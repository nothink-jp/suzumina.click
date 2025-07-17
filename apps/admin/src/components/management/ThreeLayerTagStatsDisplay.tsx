import { Badge } from "@suzumina.click/ui/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@suzumina.click/ui/components/ui/card";
import { Progress } from "@suzumina.click/ui/components/ui/progress";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@suzumina.click/ui/components/ui/table";
import { Hash, Play, Tags, TrendingUp } from "lucide-react";
import type { ThreeLayerTagStats } from "@/app/actions/video-actions";

interface ThreeLayerTagStatsDisplayProps {
	stats: ThreeLayerTagStats;
}

export function ThreeLayerTagStatsDisplay({ stats }: ThreeLayerTagStatsDisplayProps) {
	// 最大値を計算（プログレスバー用）
	const maxPlaylistTagCount = Math.max(...stats.playlistTags.topTags.map((t) => t.count), 1);
	const maxUserTagCount = Math.max(...stats.userTags.topTags.map((t) => t.count), 1);
	const maxCategoryCount = Math.max(...stats.categories.topCategories.map((c) => c.count), 1);

	return (
		<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
			{/* プレイリストタグ統計 */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2 text-blue-600">
						<Play className="h-5 w-5" />
						プレイリストタグ
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					{/* 概要統計 */}
					<div className="grid grid-cols-2 gap-4">
						<div className="text-center">
							<div className="text-2xl font-bold text-blue-600">
								{stats.playlistTags.totalVideos}
							</div>
							<div className="text-sm text-muted-foreground">タグ付き動画</div>
						</div>
						<div className="text-center">
							<div className="text-2xl font-bold text-blue-600">
								{stats.playlistTags.uniqueTags}
							</div>
							<div className="text-sm text-muted-foreground">ユニークタグ</div>
						</div>
					</div>

					{/* トップタグ */}
					<div>
						<h4 className="text-sm font-medium mb-2 flex items-center gap-1">
							<TrendingUp className="h-4 w-4" />
							人気タグ (上位5件)
						</h4>
						<div className="space-y-2">
							{stats.playlistTags.topTags.slice(0, 5).map((tag, index) => (
								<div key={tag.tag} className="flex items-center gap-2">
									<Badge variant="outline" className="w-6 h-6 text-xs justify-center p-0">
										{index + 1}
									</Badge>
									<div className="flex-1 min-w-0">
										<div className="text-sm font-medium truncate">{tag.tag}</div>
										<Progress value={(tag.count / maxPlaylistTagCount) * 100} className="h-2" />
									</div>
									<div className="text-sm font-medium text-blue-600">{tag.count}</div>
								</div>
							))}
						</div>
					</div>
				</CardContent>
			</Card>

			{/* ユーザータグ統計 */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2 text-green-600">
						<Tags className="h-5 w-5" />
						ユーザータグ
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					{/* 概要統計 */}
					<div className="grid grid-cols-2 gap-4">
						<div className="text-center">
							<div className="text-2xl font-bold text-green-600">{stats.userTags.totalVideos}</div>
							<div className="text-sm text-muted-foreground">タグ付き動画</div>
						</div>
						<div className="text-center">
							<div className="text-2xl font-bold text-green-600">{stats.userTags.uniqueTags}</div>
							<div className="text-sm text-muted-foreground">ユニークタグ</div>
						</div>
					</div>

					{/* トップタグ */}
					<div>
						<h4 className="text-sm font-medium mb-2 flex items-center gap-1">
							<TrendingUp className="h-4 w-4" />
							人気タグ (上位5件)
						</h4>
						<div className="space-y-2">
							{stats.userTags.topTags.slice(0, 5).map((tag, index) => (
								<div key={tag.tag} className="flex items-center gap-2">
									<Badge variant="outline" className="w-6 h-6 text-xs justify-center p-0">
										{index + 1}
									</Badge>
									<div className="flex-1 min-w-0">
										<div className="text-sm font-medium truncate">{tag.tag}</div>
										<Progress value={(tag.count / maxUserTagCount) * 100} className="h-2" />
									</div>
									<div className="text-sm font-medium text-green-600">{tag.count}</div>
								</div>
							))}
						</div>
					</div>
				</CardContent>
			</Card>

			{/* カテゴリ統計 */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2 text-purple-600">
						<Hash className="h-5 w-5" />
						YouTubeカテゴリ
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					{/* 概要統計 */}
					<div className="grid grid-cols-2 gap-4">
						<div className="text-center">
							<div className="text-2xl font-bold text-purple-600">
								{stats.categories.totalVideos}
							</div>
							<div className="text-sm text-muted-foreground">カテゴリ付き動画</div>
						</div>
						<div className="text-center">
							<div className="text-2xl font-bold text-purple-600">
								{stats.categories.uniqueCategories}
							</div>
							<div className="text-sm text-muted-foreground">使用カテゴリ</div>
						</div>
					</div>

					{/* トップカテゴリ */}
					<div>
						<h4 className="text-sm font-medium mb-2 flex items-center gap-1">
							<TrendingUp className="h-4 w-4" />
							人気カテゴリ (上位5件)
						</h4>
						<div className="space-y-2">
							{stats.categories.topCategories.slice(0, 5).map((category, index) => (
								<div key={category.categoryId} className="flex items-center gap-2">
									<Badge variant="outline" className="w-6 h-6 text-xs justify-center p-0">
										{index + 1}
									</Badge>
									<div className="flex-1 min-w-0">
										<div className="text-sm font-medium truncate">{category.categoryName}</div>
										<Progress value={(category.count / maxCategoryCount) * 100} className="h-2" />
									</div>
									<div className="text-sm font-medium text-purple-600">{category.count}</div>
								</div>
							))}
						</div>
					</div>
				</CardContent>
			</Card>

			{/* 詳細統計テーブル - 3列全体に横断 */}
			<div className="lg:col-span-3">
				<Card>
					<CardHeader>
						<CardTitle>詳細統計一覧</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
							{/* プレイリストタグ詳細 */}
							<div>
								<h4 className="font-medium mb-3 text-blue-600">
									プレイリストタグ (全 {stats.playlistTags.topTags.length} 件)
								</h4>
								<div className="rounded-md border">
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead>タグ名</TableHead>
												<TableHead className="text-right">動画数</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{stats.playlistTags.topTags.map((tag) => (
												<TableRow key={tag.tag}>
													<TableCell className="font-medium">{tag.tag}</TableCell>
													<TableCell className="text-right">{tag.count}</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								</div>
							</div>

							{/* ユーザータグ詳細 */}
							<div>
								<h4 className="font-medium mb-3 text-green-600">
									ユーザータグ (全 {stats.userTags.topTags.length} 件)
								</h4>
								<div className="rounded-md border">
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead>タグ名</TableHead>
												<TableHead className="text-right">動画数</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{stats.userTags.topTags.map((tag) => (
												<TableRow key={tag.tag}>
													<TableCell className="font-medium">{tag.tag}</TableCell>
													<TableCell className="text-right">{tag.count}</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								</div>
							</div>

							{/* カテゴリ詳細 */}
							<div>
								<h4 className="font-medium mb-3 text-purple-600">
									カテゴリ (全 {stats.categories.topCategories.length} 件)
								</h4>
								<div className="rounded-md border">
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead>カテゴリ名</TableHead>
												<TableHead className="text-right">動画数</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{stats.categories.topCategories.map((category) => (
												<TableRow key={category.categoryId}>
													<TableCell className="font-medium">{category.categoryName}</TableCell>
													<TableCell className="text-right">{category.count}</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								</div>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
