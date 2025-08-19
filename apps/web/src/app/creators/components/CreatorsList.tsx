"use client";

import { CREATOR_TYPE_LABELS, type CreatorPageInfo } from "@suzumina.click/shared-types";
import { ConfigurableList, type StandardListParams } from "@suzumina.click/ui/components/custom";
import { Badge } from "@suzumina.click/ui/components/ui/badge";
import Link from "next/link";
import { useCallback, useMemo } from "react";
import { ListWrapper } from "@/components/list/ListWrapper";
import { DEFAULT_LIST_PROPS } from "@/constants/list-options";
import { getCreators } from "../actions";

interface CreatorsListProps {
	initialData?: {
		creators: CreatorPageInfo[];
		totalCount: number;
	};
}

// クリエイターのソートオプション
const CREATOR_SORT_OPTIONS = [
	{ value: "name", label: "名前順（昇順）" },
	{ value: "nameDesc", label: "名前順（降順）" },
	{ value: "workCount", label: "作品数（多い順）" },
	{ value: "workCountAsc", label: "作品数（少ない順）" },
];

// 役割フィルターのオプション
const ROLE_OPTIONS = [
	{ value: "all", label: "すべての役割" },
	...Object.entries(CREATOR_TYPE_LABELS).map(([value, label]) => ({
		value,
		label,
	})),
];

// クリエイターアイテムコンポーネント
function CreatorListItem({ creator }: { creator: CreatorPageInfo }) {
	return (
		<Link
			href={`/creators/${creator.id}`}
			className="block p-4 rounded-lg border bg-card hover:bg-accent transition-colors"
		>
			<div className="flex items-center justify-between">
				<div className="flex-1 min-w-0">
					<h3 className="font-semibold text-lg truncate">{creator.name}</h3>
					<div className="flex flex-wrap gap-1 mt-2">
						{creator.types.map((type) => {
							// Handle both old and new CreatorType values
							let mappedType = type;
							if (type === "voiceActor") {
								mappedType = "voice";
							}
							const label = (CREATOR_TYPE_LABELS as Record<string, string>)[mappedType] || type;
							return (
								<Badge key={type} variant="secondary" className="text-xs">
									{label}
								</Badge>
							);
						})}
					</div>
				</div>
				<div className="flex-shrink-0 ml-4">
					<div className="text-right">
						<div className="text-2xl font-bold text-primary">{creator.workCount}</div>
						<div className="text-xs text-muted-foreground">作品</div>
					</div>
				</div>
			</div>
		</Link>
	);
}

export default function CreatorsList({ initialData }: CreatorsListProps) {
	// 初期データを準備
	const initialItems = initialData?.creators || [];
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
					role: params.filters.role as string | undefined,
				};
			},
			fromResult: (result: unknown) => result as { items: CreatorPageInfo[]; total: number },
		}),
		[],
	);

	// フェッチ関数
	const fetchFn = useCallback(async (params: unknown) => {
		const typedParams = params as Parameters<typeof getCreators>[0];
		const result = await getCreators(typedParams);
		return {
			items: result.creators,
			total: result.totalCount || 0,
		};
	}, []);

	return (
		<ListWrapper>
			<ConfigurableList<CreatorPageInfo>
				items={initialItems}
				initialTotal={initialTotal}
				renderItem={(creator) => <CreatorListItem creator={creator} />}
				fetchFn={fetchFn}
				dataAdapter={dataAdapter}
				{...DEFAULT_LIST_PROPS}
				sorts={CREATOR_SORT_OPTIONS}
				defaultSort="name"
				filters={{
					role: {
						type: "select",
						label: "役割",
						placeholder: "すべての役割",
						options: ROLE_OPTIONS,
						showAll: false, // "all" オプションを明示的に含めているのでshowAllは不要
						emptyValue: "all",
					},
				}}
				itemsPerPageOptions={[12, 24, 48]}
				emptyMessage="クリエイターが見つかりませんでした"
				searchPlaceholder="クリエイター名で検索"
			/>
		</ListWrapper>
	);
}
