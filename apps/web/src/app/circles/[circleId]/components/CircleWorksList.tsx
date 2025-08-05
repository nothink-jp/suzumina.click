"use client";

import type { WorkListResultPlain, WorkPlainObject } from "@suzumina.click/shared-types";
import {
	ConfigurableList,
	type StandardListParams,
} from "@suzumina.click/ui/components/custom/list";
import { useCallback, useMemo } from "react";
import WorkCard from "@/app/works/components/WorkCard";
import { fetchCircleWorksForConfigurableList } from "../actions";

interface CircleWorksListProps {
	circleId: string;
	initialData?: WorkListResultPlain;
}

// 作品表示用のコンポーネント
function WorkItem({ work }: { work: WorkPlainObject }) {
	return <WorkCard work={work} />;
}

export default function CircleWorksList({ circleId, initialData }: CircleWorksListProps) {
	// 初期データを変換
	const transformedInitialData = useMemo(() => {
		if (!initialData) return null;
		return {
			items: initialData.works,
			total: initialData.totalCount || 0,
			page: 1,
			itemsPerPage: initialData.works.length,
		};
	}, [initialData]);

	// データアダプター
	const dataAdapter = useMemo(
		() => ({
			toParams: (params: StandardListParams) => {
				return {
					circleId,
					page: params.page,
					limit: params.itemsPerPage,
					sort: params.sort || "newest",
					search: params.search,
				};
			},
			fromResult: (result: unknown) => result as { items: WorkPlainObject[]; total: number },
		}),
		[circleId],
	);

	// フェッチ関数
	const fetchFn = useCallback(async (params: unknown) => {
		const typedParams = params as Parameters<typeof fetchCircleWorksForConfigurableList>[0];
		const result = await fetchCircleWorksForConfigurableList(typedParams);
		return {
			items: result.works,
			total: result.totalCount || 0,
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
				itemsPerPageOptions={[12, 24, 48]}
				emptyMessage="作品が見つかりませんでした"
			/>
		</div>
	);
}
