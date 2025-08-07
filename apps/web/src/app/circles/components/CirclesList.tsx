"use client";

import type { CirclePlainObject } from "@suzumina.click/shared-types";
import {
	ConfigurableList,
	type StandardListParams,
} from "@suzumina.click/ui/components/custom/list";
import Link from "next/link";
import { useCallback, useMemo } from "react";
import { ListWrapper } from "@/components/list/ListWrapper";
import { DEFAULT_LIST_PROPS } from "@/constants/list-options";
import { getCircles } from "../actions";

interface CirclesListProps {
	initialData?: {
		circles: CirclePlainObject[];
		totalCount: number;
	};
}

// サークルのソートオプション
const CIRCLE_SORT_OPTIONS = [
	{ value: "name", label: "名前順（昇順）" },
	{ value: "nameDesc", label: "名前順（降順）" },
	{ value: "workCount", label: "作品数（多い順）" },
	{ value: "workCountAsc", label: "作品数（少ない順）" },
];

// サークルアイテムコンポーネント
function CircleListItem({ circle }: { circle: CirclePlainObject }) {
	return (
		<Link
			href={`/circles/${circle.circleId}`}
			className="block p-4 rounded-lg border bg-card hover:bg-accent transition-colors"
		>
			<div className="flex items-center justify-between">
				<div className="flex-1 min-w-0">
					<h3 className="font-semibold text-lg truncate">{circle.name}</h3>
					{circle.nameEn && (
						<p className="text-sm text-muted-foreground truncate">{circle.nameEn}</p>
					)}
				</div>
				<div className="flex-shrink-0 ml-4">
					<div className="text-right">
						<div className="text-2xl font-bold text-primary">{circle.workCount}</div>
						<div className="text-xs text-muted-foreground">作品</div>
					</div>
				</div>
			</div>
		</Link>
	);
}

export default function CirclesList({ initialData }: CirclesListProps) {
	// 初期データを準備
	const initialItems = initialData?.circles || [];
	const initialTotal = initialData?.totalCount || 0;

	// データアダプター
	const dataAdapter = useMemo(
		() => ({
			toParams: (params: StandardListParams) => {
				return {
					page: params.page,
					limit: params.itemsPerPage,
					sort: params.sort || "name",
					search: params.search,
				};
			},
			fromResult: (result: unknown) => result as { items: CirclePlainObject[]; total: number },
		}),
		[],
	);

	// フェッチ関数
	const fetchFn = useCallback(async (params: unknown) => {
		const typedParams = params as Parameters<typeof getCircles>[0];
		const result = await getCircles(typedParams);
		return {
			items: result.circles,
			total: result.totalCount || 0,
		};
	}, []);

	return (
		<ListWrapper>
			<ConfigurableList<CirclePlainObject>
				items={initialItems}
				initialTotal={initialTotal}
				renderItem={(circle) => <CircleListItem circle={circle} />}
				fetchFn={fetchFn}
				dataAdapter={dataAdapter}
				{...DEFAULT_LIST_PROPS}
				sorts={CIRCLE_SORT_OPTIONS}
				defaultSort="name"
				itemsPerPageOptions={[12, 24, 48]}
				emptyMessage="サークルが見つかりませんでした"
				searchPlaceholder="サークル名で検索"
			/>
		</ListWrapper>
	);
}
