import type { AudioReferenceCategory, AudioReferenceQuery } from "@suzumina.click/shared-types";
import { Button } from "@suzumina.click/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@suzumina.click/ui/components/card";
import { Skeleton } from "@suzumina.click/ui/components/skeleton";
import { Clock, Plus, Sparkles, TrendingUp } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import {
	getAudioReferences,
	getPopularAudioReferences,
	getRecentAudioReferences,
} from "@/app/buttons/actions";
import { AudioReferenceCard } from "@/components/AudioReferenceCard";
import { AudioButtonSearch } from "./components/AudioButtonSearch";

interface SearchParams {
	q?: string;
	category?: string;
	tags?: string;
	sort?: string;
	page?: string;
}

interface AudioButtonsPageProps {
	searchParams: Promise<SearchParams>;
}

async function AudioButtonsList({ searchParams }: { searchParams: SearchParams }) {
	const query: AudioReferenceQuery = {
		limit: 20,
		searchText: searchParams.q,
		category: searchParams.category as AudioReferenceCategory | undefined,
		tags: searchParams.tags ? searchParams.tags.split(",") : undefined,
		sortBy:
			(searchParams.sort as "newest" | "oldest" | "popular" | "mostPlayed" | "mostLiked") ||
			"newest",
		onlyPublic: true,
	};

	const result = await getAudioReferences(query);

	if (!result.success) {
		return (
			<Card className="text-center py-12">
				<CardContent>
					<div className="space-y-4">
						<Sparkles className="mx-auto h-12 w-12 text-gray-400" />
						<div>
							<h3 className="text-lg font-medium text-gray-900">エラーが発生しました</h3>
							<p className="text-gray-500 mt-1">{result.error}</p>
						</div>
					</div>
				</CardContent>
			</Card>
		);
	}

	const audioReferences = result.data.audioReferences;

	if (audioReferences.length === 0) {
		return (
			<Card className="text-center py-12">
				<CardContent>
					<div className="space-y-4">
						<Sparkles className="mx-auto h-12 w-12 text-gray-400" />
						<div>
							<h3 className="text-lg font-medium text-gray-900">
								音声ボタンが見つかりませんでした
							</h3>
							<p className="text-gray-500 mt-1">
								検索条件を変更するか、新しい音声ボタンを作成してみましょう
							</p>
						</div>
						<Button asChild>
							<Link href="/buttons/create">
								<Plus className="h-4 w-4 mr-2" />
								音声ボタンを作成
							</Link>
						</Button>
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="space-y-6">
			{/* 検索結果ヘッダー */}
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-xl font-bold text-gray-900">検索結果</h2>
					<p className="text-gray-600">{audioReferences.length} 件の音声ボタン</p>
				</div>
				<Button asChild>
					<Link href="/buttons/create">
						<Plus className="h-4 w-4 mr-2" />
						新規作成
					</Link>
				</Button>
			</div>

			{/* 音声ボタン一覧 */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				{audioReferences.map((audioReference) => (
					<AudioReferenceCard
						key={audioReference.id}
						audioReference={audioReference}
						showSourceVideo={true}
						size="md"
						variant="default"
					/>
				))}
			</div>

			{/* ページネーション（TODO: 実装予定） */}
			{result.data.hasMore && (
				<Card className="text-center py-6">
					<CardContent>
						<p className="text-gray-600 mb-4">さらに音声ボタンがあります</p>
						<Button variant="outline">もっと読み込む</Button>
					</CardContent>
				</Card>
			)}
		</div>
	);
}

async function PopularAudioButtons() {
	const popularButtons = await getPopularAudioReferences(6);

	if (popularButtons.length === 0) {
		return null;
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<TrendingUp className="h-5 w-5" />
					人気の音声ボタン
				</CardTitle>
				<CardDescription>再生回数の多い音声ボタンをご紹介</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{popularButtons.map((audioReference) => (
						<AudioReferenceCard
							key={audioReference.id}
							audioReference={audioReference}
							showSourceVideo={false}
							size="sm"
							variant="compact"
						/>
					))}
				</div>
				<div className="mt-4 text-center">
					<Button variant="outline" asChild>
						<Link href="/buttons?sort=popular">人気の音声ボタンをもっと見る</Link>
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}

async function RecentAudioButtons() {
	const recentButtons = await getRecentAudioReferences(6);

	if (recentButtons.length === 0) {
		return null;
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Clock className="h-5 w-5" />
					最新の音声ボタン
				</CardTitle>
				<CardDescription>最近作成された音声ボタンをご紹介</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
					{recentButtons.map((audioReference) => (
						<AudioReferenceCard
							key={audioReference.id}
							audioReference={audioReference}
							showSourceVideo={false}
							size="sm"
							variant="compact"
						/>
					))}
				</div>
				<div className="mt-4 text-center">
					<Button variant="outline" asChild>
						<Link href="/buttons?sort=newest">最新の音声ボタンをもっと見る</Link>
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}

function AudioButtonsListSkeleton() {
	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<Skeleton className="h-6 w-24" />
					<Skeleton className="h-4 w-32 mt-1" />
				</div>
				<Skeleton className="h-10 w-24" />
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				{Array.from({ length: 6 }, (_, i) => (
					<Card key={`main-skeleton-${Date.now()}-${i}`}>
						<CardHeader>
							<Skeleton className="h-5 w-3/4" />
							<Skeleton className="h-4 w-full" />
							<div className="flex gap-1 mt-2">
								<Skeleton className="h-5 w-12" />
								<Skeleton className="h-5 w-16" />
								<Skeleton className="h-5 w-14" />
							</div>
						</CardHeader>
						<CardContent className="space-y-4">
							<Skeleton className="h-12 w-full" />
							<div className="grid grid-cols-2 gap-4">
								<Skeleton className="h-4 w-full" />
								<Skeleton className="h-4 w-full" />
							</div>
							<div className="flex gap-2">
								<Skeleton className="h-8 flex-1" />
								<Skeleton className="h-8 flex-1" />
							</div>
						</CardContent>
					</Card>
				))}
			</div>
		</div>
	);
}

export default async function AudioButtonsPage({ searchParams }: AudioButtonsPageProps) {
	// 検索パラメータを解決
	const resolvedSearchParams = await searchParams;
	// 検索パラメータがある場合は検索結果を表示
	const hasSearchParams = Object.keys(resolvedSearchParams).length > 0;

	return (
		<div className="container mx-auto px-4 py-8">
			{/* ページヘッダー */}
			<div className="mb-8">
				<div className="flex items-center justify-between mb-4">
					<div>
						<h1 className="text-4xl font-bold text-gray-900 mb-2">音声ボタン</h1>
						<p className="text-gray-600">涼花みなせの音声ボタンを検索・再生できます</p>
					</div>
					<Button asChild>
						<Link href="/buttons/create">
							<Plus className="h-4 w-4 mr-2" />
							音声ボタンを作成
						</Link>
					</Button>
				</div>

				{/* 検索フォーム */}
				<AudioButtonSearch />
			</div>

			{hasSearchParams ? (
				/* 検索結果表示 */
				<Suspense fallback={<AudioButtonsListSkeleton />}>
					<AudioButtonsList searchParams={resolvedSearchParams} />
				</Suspense>
			) : (
				/* デフォルト表示（人気・最新） */
				<div className="space-y-8">
					<Suspense
						fallback={
							<Card>
								<CardHeader>
									<Skeleton className="h-6 w-32" />
									<Skeleton className="h-4 w-48" />
								</CardHeader>
								<CardContent>
									<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
										{Array.from({ length: 6 }, (_, i) => (
											<Card key={`popular-skeleton-${Date.now()}-${i}`}>
												<CardContent className="p-4">
													<Skeleton className="h-12 w-full" />
												</CardContent>
											</Card>
										))}
									</div>
								</CardContent>
							</Card>
						}
					>
						<PopularAudioButtons />
					</Suspense>

					<Suspense
						fallback={
							<Card>
								<CardHeader>
									<Skeleton className="h-6 w-32" />
									<Skeleton className="h-4 w-48" />
								</CardHeader>
								<CardContent>
									<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
										{Array.from({ length: 6 }, (_, i) => (
											<Card key={`recent-skeleton-${Date.now()}-${i}`}>
												<CardContent className="p-4">
													<Skeleton className="h-12 w-full" />
												</CardContent>
											</Card>
										))}
									</div>
								</CardContent>
							</Card>
						}
					>
						<RecentAudioButtons />
					</Suspense>

					{/* 全ての音声ボタンを見るボタン */}
					<Card className="text-center py-8">
						<CardContent>
							<div className="space-y-4">
								<h3 className="text-lg font-medium text-gray-900">すべての音声ボタンを探索</h3>
								<p className="text-gray-600">
									カテゴリやタグで絞り込んで、お気に入りの音声ボタンを見つけましょう
								</p>
								<Button asChild>
									<Link href="/buttons?sort=newest">すべての音声ボタンを見る</Link>
								</Button>
							</div>
						</CardContent>
					</Card>
				</div>
			)}
		</div>
	);
}
