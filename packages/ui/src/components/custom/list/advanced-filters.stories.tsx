import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { ConfigurableList } from "./configurable-list";
import type { FilterConfig } from "./core/types";

const meta = {
	title: "Components/List/Advanced Filters",
	component: ConfigurableList,
	parameters: {
		layout: "padded",
		docs: {
			description: {
				component: "高度なフィルタータイプ（multiselect, range, date, dateRange）のデモ",
			},
		},
	},
} satisfies Meta<typeof ConfigurableList>;

export default meta;
type Story = StoryObj<typeof meta>;

// サンプルデータ
interface Product {
	id: number;
	name: string;
	price: number;
	categories: string[];
	stock: number;
	createdAt: string;
	lastSaleDate: string;
}

const sampleProducts: Product[] = Array.from({ length: 100 }, (_, i) => ({
	id: i + 1,
	name: `商品 ${i + 1}`,
	price: Math.floor(Math.random() * 10000) + 1000,
	categories: ["電化製品", "家具", "衣類", "食品", "書籍"].filter(() => Math.random() > 0.6),
	stock: Math.floor(Math.random() * 100),
	createdAt: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1)
		.toISOString()
		.split("T")[0],
	lastSaleDate: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1)
		.toISOString()
		.split("T")[0],
}));

// フェッチ関数のシミュレーション
async function fetchProducts(params: any) {
	await new Promise((resolve) => setTimeout(resolve, 300));

	let filtered = [...sampleProducts];

	// フィルタリング
	if (params.filters.categories && params.filters.categories.length > 0) {
		filtered = filtered.filter((p) =>
			params.filters.categories.some((cat: string) => p.categories.includes(cat)),
		);
	}

	if (params.filters.price) {
		const { min, max } = params.filters.price;
		filtered = filtered.filter((p) => {
			if (min !== undefined && p.price < min) return false;
			if (max !== undefined && p.price > max) return false;
			return true;
		});
	}

	if (params.filters.stock) {
		const { min, max } = params.filters.stock;
		filtered = filtered.filter((p) => {
			if (min !== undefined && p.stock < min) return false;
			if (max !== undefined && p.stock > max) return false;
			return true;
		});
	}

	if (params.filters.createdAt) {
		filtered = filtered.filter((p) => p.createdAt === params.filters.createdAt);
	}

	if (params.filters.salesPeriod) {
		const { start, end } = params.filters.salesPeriod;
		filtered = filtered.filter((p) => {
			if (start && p.lastSaleDate < start) return false;
			if (end && p.lastSaleDate > end) return false;
			return true;
		});
	}

	// 検索
	if (params.search) {
		const searchLower = params.search.toLowerCase();
		filtered = filtered.filter((p) => p.name.toLowerCase().includes(searchLower));
	}

	// ソート
	if (params.sort === "price-asc") {
		filtered.sort((a, b) => a.price - b.price);
	} else if (params.sort === "price-desc") {
		filtered.sort((a, b) => b.price - a.price);
	} else if (params.sort === "stock") {
		filtered.sort((a, b) => b.stock - a.stock);
	}

	// ページネーション
	const start = (params.page - 1) * params.itemsPerPage;
	const items = filtered.slice(start, start + params.itemsPerPage);

	return {
		items,
		total: filtered.length,
	};
}

export const AllFilterTypes: Story = {
	render: () => {
		const filters: Record<string, FilterConfig> = {
			categories: {
				type: "multiselect",
				label: "カテゴリ",
				options: ["電化製品", "家具", "衣類", "食品", "書籍"],
			},
			price: {
				type: "range",
				label: "価格",
				min: 0,
				max: 15000,
				step: 100,
			},
			stock: {
				type: "range",
				label: "在庫数",
				min: 0,
				max: 100,
				step: 1,
			},
			createdAt: {
				type: "date",
				label: "登録日",
			},
			salesPeriod: {
				type: "dateRange",
				label: "販売期間",
				minDate: "2024-01-01",
				maxDate: "2024-12-31",
			},
		};

		return (
			<ConfigurableList
				items={sampleProducts.slice(0, 10)}
				filters={filters}
				sorts={[
					{ value: "name", label: "名前順" },
					{ value: "price-asc", label: "価格: 安い順" },
					{ value: "price-desc", label: "価格: 高い順" },
					{ value: "stock", label: "在庫: 多い順" },
				]}
				fetchData={fetchProducts}
				renderItem={(product) => (
					<div className="p-4 border rounded-lg hover:shadow-md transition-shadow">
						<div className="flex justify-between items-start mb-2">
							<h3 className="font-semibold text-lg">{product.name}</h3>
							<span className="text-lg font-bold text-blue-600">
								¥{product.price.toLocaleString()}
							</span>
						</div>
						<div className="space-y-1 text-sm text-gray-600">
							<div>カテゴリ: {product.categories.join(", ") || "なし"}</div>
							<div>在庫: {product.stock}個</div>
							<div>登録日: {product.createdAt}</div>
							<div>最終販売日: {product.lastSaleDate}</div>
						</div>
					</div>
				)}
			/>
		);
	},
};

export const MultiselectFilter: Story = {
	render: () => {
		const filters: Record<string, FilterConfig> = {
			tags: {
				type: "multiselect",
				label: "タグ",
				options: [
					{ value: "new", label: "新商品" },
					{ value: "sale", label: "セール中" },
					{ value: "limited", label: "限定品" },
					{ value: "popular", label: "人気商品" },
					{ value: "recommended", label: "おすすめ" },
				],
			},
		};

		return (
			<ConfigurableList
				items={[]}
				filters={filters}
				fetchData={async () => ({ items: [], total: 0 })}
				renderItem={() => null}
			/>
		);
	},
};

export const RangeFilter: Story = {
	render: () => {
		const filters: Record<string, FilterConfig> = {
			rating: {
				type: "range",
				label: "評価",
				min: 0,
				max: 5,
				step: 0.5,
			},
			reviewCount: {
				type: "range",
				label: "レビュー数",
				min: 0,
				max: 1000,
				step: 10,
			},
		};

		return (
			<ConfigurableList
				items={[]}
				filters={filters}
				fetchData={async () => ({ items: [], total: 0 })}
				renderItem={() => null}
			/>
		);
	},
};

export const DateFilters: Story = {
	render: () => {
		const filters: Record<string, FilterConfig> = {
			publishDate: {
				type: "date",
				label: "公開日",
			},
			eventPeriod: {
				type: "dateRange",
				label: "イベント期間",
				minDate: "2024-01-01",
				maxDate: "2024-12-31",
			},
		};

		return (
			<ConfigurableList
				items={[]}
				filters={filters}
				fetchData={async () => ({ items: [], total: 0 })}
				renderItem={() => null}
			/>
		);
	},
};

export const CombinedFilters: Story = {
	render: () => {
		const [activeFilters, setActiveFilters] = useState<Record<string, any>>({});

		const filters: Record<string, FilterConfig> = {
			status: {
				type: "select",
				label: "ステータス",
				options: ["公開", "下書き", "アーカイブ"],
				showAll: true,
			},
			categories: {
				type: "multiselect",
				label: "カテゴリ",
				options: ["ニュース", "ブログ", "お知らせ", "プレスリリース"],
			},
			viewCount: {
				type: "range",
				label: "閲覧数",
				min: 0,
				max: 10000,
				step: 100,
			},
			featured: {
				type: "boolean",
				label: "注目記事",
			},
			publishDate: {
				type: "dateRange",
				label: "公開期間",
			},
		};

		return (
			<div className="space-y-4">
				<div className="p-4 bg-gray-100 rounded">
					<h3 className="font-semibold mb-2">アクティブなフィルター:</h3>
					<pre className="text-sm">{JSON.stringify(activeFilters, null, 2)}</pre>
				</div>

				<ConfigurableList
					items={[]}
					filters={filters}
					fetchData={async (params) => {
						setActiveFilters(params.filters);
						return { items: [], total: 0 };
					}}
					renderItem={() => null}
				/>
			</div>
		);
	},
};
