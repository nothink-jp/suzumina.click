"use client";

import type {
	AudioButtonCategory,
	AudioButtonQuery,
	FrontendAudioButtonData,
} from "@suzumina.click/shared-types";
import { ListHeader } from "@suzumina.click/ui/components/custom/list-header";
import {
	ListPageEmptyState,
	ListPageGrid,
	ListPageStats,
} from "@suzumina.click/ui/components/custom/list-page-layout";
import {
	FilterSelect,
	SearchFilterPanel,
	SortSelect,
} from "@suzumina.click/ui/components/custom/search-filter-panel";
import { SimpleAudioButton } from "@suzumina.click/ui/components/custom/simple-audio-button";
import { Button } from "@suzumina.click/ui/components/ui/button";
import { Plus, Sparkles } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { startTransition, useEffect, useState } from "react";
import { getAudioButtons } from "@/app/buttons/actions";
import Pagination from "@/components/Pagination";

interface SearchParams {
	q?: string;
	category?: string;
	tags?: string;
	sort?: string;
	page?: string;
}

interface AudioButtonsListProps {
	searchParams: SearchParams;
}

export default function AudioButtonsList({ searchParams }: AudioButtonsListProps) {
	const router = useRouter();
	const urlSearchParams = useSearchParams();
	const [audioButtons, setAudioButtons] = useState<FrontendAudioButtonData[]>([]);
	const [totalCount, setTotalCount] = useState(0);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	// フォームの状態
	const [searchQuery, setSearchQuery] = useState(searchParams.q || "");
	const [sortBy, setSortBy] = useState(searchParams.sort || "default");
	const [categoryFilter, setCategoryFilter] = useState(searchParams.category || "all");

	const currentPage = searchParams.page ? Number.parseInt(searchParams.page, 10) : 1;
	const itemsPerPage = 12;
	const totalPages = Math.ceil(totalCount / itemsPerPage);

	// データ取得
	useEffect(() => {
		const fetchData = async () => {
			setLoading(true);
			setError(null);

			const query: AudioButtonQuery = {
				limit: itemsPerPage,
				searchText: searchParams.q,
				category: searchParams.category as AudioButtonCategory | undefined,
				tags: searchParams.tags ? searchParams.tags.split(",") : undefined,
				sortBy: (searchParams.sort as "newest" | "oldest" | "popular" | "mostPlayed") || "newest",
				onlyPublic: true,
			};

			try {
				const result = await getAudioButtons(query);
				if (result.success) {
					setAudioButtons(result.data.audioButtons);
					// TODO: バックエンドでtotalCountを返すように修正が必要
					setTotalCount(result.data.audioButtons.length);
				} else {
					setError(result.error || "エラーが発生しました");
				}
			} catch (_err) {
				setError("データの取得に失敗しました");
			} finally {
				setLoading(false);
			}
		};

		fetchData();
	}, [searchParams]);

	// URLパラメータを更新
	const updateSearchParams = (params: Record<string, string | undefined>) => {
		const newParams = new URLSearchParams(urlSearchParams.toString());

		Object.entries(params).forEach(([key, value]) => {
			if (value) {
				newParams.set(key, value);
			} else {
				newParams.delete(key);
			}
		});

		// ページ番号をリセット
		if (!params.page) {
			newParams.delete("page");
		}

		router.push(`/buttons?${newParams.toString()}`);
	};

	const handleSearch = () => {
		startTransition(() => {
			updateSearchParams({ q: searchQuery || undefined });
		});
	};

	const handleSortChange = (value: string) => {
		setSortBy(value);
		startTransition(() => {
			updateSearchParams({ sort: value === "default" ? undefined : value });
		});
	};

	const handleCategoryChange = (value: string) => {
		setCategoryFilter(value);
		startTransition(() => {
			updateSearchParams({ category: value === "all" ? undefined : value });
		});
	};

	if (loading) {
		return (
			<div className="text-center py-12">
				<div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
				<p className="mt-2 text-muted-foreground">読み込み中...</p>
			</div>
		);
	}

	if (error) {
		return (
			<ListPageEmptyState
				icon={<Sparkles className="mx-auto h-12 w-12" />}
				title="エラーが発生しました"
				description={error}
			/>
		);
	}

	return (
		<div>
			{/* 検索・フィルター */}
			<SearchFilterPanel
				searchValue={searchQuery}
				onSearchChange={setSearchQuery}
				onSearch={handleSearch}
				searchPlaceholder="音声ボタンを検索..."
				filters={
					<>
						<SortSelect
							value={sortBy}
							onValueChange={handleSortChange}
							options={[
								{ value: "default", label: "並び順" },
								{ value: "newest", label: "新しい順" },
								{ value: "oldest", label: "古い順" },
								{ value: "popular", label: "人気順" },
								{ value: "mostPlayed", label: "再生回数順" },
							]}
						/>
						<FilterSelect
							value={categoryFilter}
							onValueChange={handleCategoryChange}
							placeholder="カテゴリー"
							options={[
								{ value: "all", label: "すべてのカテゴリー" },
								{ value: "greeting", label: "挨拶" },
								{ value: "reaction", label: "リアクション" },
								{ value: "emotion", label: "感情" },
								{ value: "action", label: "アクション" },
								{ value: "other", label: "その他" },
							]}
						/>
					</>
				}
			/>

			{/* ヘッダー */}
			<ListHeader
				title="音声ボタン一覧"
				totalCount={totalCount}
				currentPage={currentPage}
				totalPages={totalPages}
			/>

			{/* 音声ボタン一覧 */}
			{audioButtons.length === 0 ? (
				<ListPageEmptyState
					icon={<Sparkles className="mx-auto h-12 w-12" />}
					title="音声ボタンが見つかりませんでした"
					description="検索条件を変更するか、新しい音声ボタンを作成してみましょう"
					action={
						<Button asChild>
							<Link href="/buttons/create">
								<Plus className="h-4 w-4 mr-2" />
								音声ボタンを作成
							</Link>
						</Button>
					}
				/>
			) : (
				<ListPageGrid>
					{audioButtons.map((audioButton) => (
						<div key={audioButton.id} className="min-h-card">
							<SimpleAudioButton audioButton={audioButton} className="w-full h-full" />
						</div>
					))}
				</ListPageGrid>
			)}

			{/* ページネーション */}
			{totalPages > 1 && (
				<div className="mt-8">
					<Pagination currentPage={currentPage} totalPages={totalPages} />
				</div>
			)}

			{/* 統計情報 */}
			{audioButtons.length > 0 && (
				<ListPageStats
					currentPage={currentPage}
					totalPages={totalPages}
					totalCount={totalCount}
					itemsPerPage={itemsPerPage}
				/>
			)}
		</div>
	);
}
