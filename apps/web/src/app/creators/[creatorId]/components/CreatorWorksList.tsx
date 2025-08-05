"use client";

import type { WorkListResultPlain, WorkPlainObject } from "@suzumina.click/shared-types";
import {
	ConfigurableList,
	type StandardListParams,
} from "@suzumina.click/ui/components/custom/list";
import { useCallback, useMemo } from "react";
import WorkCard from "@/app/works/components/WorkCard";
import { fetchCreatorWorksForConfigurableList } from "../actions";

// ページサイズオプションを定数として定義
const ITEMS_PER_PAGE_OPTIONS = [12, 24, 48] as const;

// 型ガード関数：fetchFnの結果が正しい形式かチェック
function isValidFetchResult(
	result: unknown,
): result is { items: WorkPlainObject[]; total: number } {
	if (!result || typeof result !== "object") return false;
	const r = result as Record<string, unknown>;
	return (
		Array.isArray(r.items) &&
		r.items.every((item) => typeof item === "object" && item !== null) &&
		typeof r.total === "number"
	);
}

interface CreatorWorksListProps {
	creatorId: string;
	initialData?: WorkListResultPlain;
}

// 作品表示用のコンポーネント
function WorkItem({ work }: { work: WorkPlainObject }) {
	return <WorkCard work={work} />;
}

export default function CreatorWorksList({ creatorId, initialData }: CreatorWorksListProps) {
	// 初期データを変換
	const transformedInitialData = useMemo(() => {
		if (!initialData) return null;
		return {
			items: initialData.works,
			total:
				initialData.hasMore !== undefined
					? (initialData.filteredCount ?? initialData.totalCount ?? 0)
					: initialData.totalCount || 0,
			page: 1,
			itemsPerPage: ITEMS_PER_PAGE_OPTIONS[0], // デフォルトのページサイズ
		};
	}, [initialData]);

	// データアダプター
	const dataAdapter = useMemo(
		() => ({
			toParams: (params: StandardListParams) => {
				return {
					creatorId,
					page: params.page,
					limit: params.itemsPerPage,
					sort: params.sort || "newest",
					search: params.search,
				};
			},
			fromResult: (result: unknown) => {
				if (!isValidFetchResult(result)) {
					// 型ガードでバリデーションエラーの場合は空の結果を返す
					return { items: [], total: 0 };
				}
				return result;
			},
		}),
		[creatorId],
	);

	// フェッチ関数
	const fetchFn = useCallback(async (params: unknown) => {
		const typedParams = params as Parameters<typeof fetchCreatorWorksForConfigurableList>[0];
		const result = await fetchCreatorWorksForConfigurableList(typedParams);
		return {
			items: result.works,
			total: result.filteredCount ?? result.totalCount ?? 0,
		};
	}, []);

	return (
		<div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-suzuka-100 p-6">
			<ConfigurableList<WorkPlainObject>
				items={transformedInitialData?.items || []}
				initialTotal={transformedInitialData?.total || 0}
				renderItem={(work) => <WorkItem work={work} />}
				fetchFn={fetchFn}
				dataAdapter={dataAdapter}
				searchable
				searchPlaceholder="作品タイトルで検索..."
				urlSync
				layout="grid"
				gridColumns={{
					default: 1,
					sm: 2,
					lg: 3,
					xl: 4,
				}}
				sorts={[
					{ value: "newest", label: "新しい順" },
					{ value: "oldest", label: "古い順" },
					{ value: "popular", label: "人気順" },
					{ value: "price_low", label: "価格が安い順" },
					{ value: "price_high", label: "価格が高い順" },
				]}
				defaultSort="newest"
				itemsPerPageOptions={[...ITEMS_PER_PAGE_OPTIONS]}
				emptyMessage="作品が見つかりませんでした"
			/>
		</div>
	);
}
