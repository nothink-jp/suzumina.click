"use client";

import type { WorkListResultPlain, WorkPlainObject } from "@suzumina.click/shared-types";
import {
	ConfigurableList,
	type StandardListParams,
} from "@suzumina.click/ui/components/custom/list";
import { useCallback } from "react";
import { useAgeVerification } from "@/contexts/age-verification-context";
import { getWorks } from "../actions";
import WorkCard from "./WorkCard";
import WorksFilters from "./WorksFilters";

interface WorksListGenericProps {
	searchParams: Record<string, string | string[] | undefined>;
	initialData?: WorkListResultPlain;
	excludeR18?: boolean;
}

// 作品表示用のコンポーネント
function WorkItem({ work }: { work: WorkPlainObject }) {
	return <WorkCard work={work} />;
}

// 検索パラメータを変換する関数
function convertSearchParams(
	params: Record<string, string | string[] | undefined>,
	excludeR18?: boolean,
) {
	// 配列の場合は最初の値を使用
	const getValue = (key: string): string | undefined => {
		const value = params[key];
		return Array.isArray(value) ? value[0] : value;
	};

	return {
		page: Number(getValue("page")) || 1,
		limit: Number(getValue("limit")) || 12,
		sort: getValue("sort") || "newest",
		search: getValue("search"),
		category: getValue("category"),
		language: getValue("language"),
		excludeR18,
	};
}

// データ取得関数のラッパー
async function fetchWorks(params: StandardListParams): Promise<{
	success: boolean;
	data?: {
		items: WorkPlainObject[];
		totalCount: number;
		hasMore: boolean;
		filteredCount?: number;
	};
	error?: string;
}> {
	try {
		const result = await getWorks(params);
		return {
			success: true,
			data: {
				items: result.works,
				totalCount: result.totalCount || 0,
				hasMore: result.hasMore,
				filteredCount: result.filteredCount,
			},
		};
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : "作品の取得に失敗しました",
		};
	}
}

export default function WorksListGeneric({
	searchParams,
	initialData,
	excludeR18,
}: WorksListGenericProps) {
	const { showR18Content } = useAgeVerification();
	const listParams = convertSearchParams(searchParams, excludeR18);

	// データ取得関数のアダプター
	const fetchDataAdapter = useCallback(async (params: unknown) => {
		const result = await fetchWorks(params as StandardListParams);
		return result;
	}, []);

	// 初期データを変換
	const convertedInitialData = initialData
		? {
				success: true,
				data: {
					items: initialData.works,
					totalCount: initialData.totalCount || 0,
					hasMore: initialData.hasMore,
					filteredCount: initialData.filteredCount,
				},
			}
		: undefined;

	return (
		<div className="space-y-6">
			{/* カスタムフィルター */}
			<WorksFilters showR18Content={showR18Content} />

			{/* 作品リスト */}
			<ConfigurableList<WorkPlainObject>
				items={convertedInitialData?.data?.items || []}
				renderItem={(work) => <WorkItem work={work} />}
				fetchFn={fetchDataAdapter}
				urlSync={true}
				searchable={false} // カスタムフィルターで検索を処理
				itemsPerPage={12}
			/>
		</div>
	);
}
