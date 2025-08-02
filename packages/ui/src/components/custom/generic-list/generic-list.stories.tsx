import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { GenericList } from "./generic-list";
import type { ListConfig, ListParams, ListResult } from "./types";

// Sample data type
interface SampleWork {
	id: string;
	title: string;
	circle: string;
	releaseDate: string;
	tags: string[];
	price: number;
	category: string;
	dlCount: number;
	rating: number;
}

// Sample data
const sampleWorks: SampleWork[] = Array.from({ length: 100 }, (_, i) => ({
	id: `RJ${String(i + 1).padStart(6, "0")}`,
	title: `作品タイトル ${i + 1}`,
	circle: `サークル ${Math.floor(i / 10) + 1}`,
	releaseDate: new Date(Date.now() - i * 86400000).toISOString(),
	tags: [`タグ${(i % 5) + 1}`, `タグ${((i + 2) % 5) + 1}`],
	price: 500 + (i % 10) * 100,
	category: ["音声作品", "ゲーム", "CG・イラスト", "マンガ"][i % 4],
	dlCount: Math.floor(Math.random() * 10000),
	rating: 3 + Math.random() * 2,
}));

// Fetch function
async function fetchWorks(params: ListParams): Promise<ListResult<SampleWork>> {
	// Simulate API delay
	await new Promise((resolve) => setTimeout(resolve, 500));

	let filteredWorks = [...sampleWorks];

	// Apply filters
	if (params.filters.category && params.filters.category !== "all") {
		filteredWorks = filteredWorks.filter((work) => work.category === params.filters.category);
	}

	if (params.filters.priceRange) {
		const { min, max } = params.filters.priceRange;
		filteredWorks = filteredWorks.filter((work) => {
			if (min !== undefined && work.price < min) return false;
			if (max !== undefined && work.price > max) return false;
			return true;
		});
	}

	// Apply search
	if (params.search) {
		const searchLower = params.search.toLowerCase();
		filteredWorks = filteredWorks.filter(
			(work) =>
				work.title.toLowerCase().includes(searchLower) ||
				work.circle.toLowerCase().includes(searchLower) ||
				work.tags.some((tag) => tag.toLowerCase().includes(searchLower)),
		);
	}

	// Apply sort
	const sortMap: Record<string, (a: SampleWork, b: SampleWork) => number> = {
		newest: (a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime(),
		oldest: (a, b) => new Date(a.releaseDate).getTime() - new Date(b.releaseDate).getTime(),
		popular: (a, b) => b.dlCount - a.dlCount,
		priceAsc: (a, b) => a.price - b.price,
		priceDesc: (a, b) => b.price - a.price,
	};

	if (params.sort && sortMap[params.sort]) {
		filteredWorks.sort(sortMap[params.sort]);
	}

	// Apply pagination
	const start = (params.page - 1) * params.limit;
	const paginatedWorks = filteredWorks.slice(start, start + params.limit);

	return {
		items: paginatedWorks,
		totalCount: sampleWorks.length,
		filteredCount: filteredWorks.length,
	};
}

const meta = {
	title: "Custom/List/GenericList",
	component: GenericList,
	tags: ["autodocs"],
	parameters: {
		layout: "fullscreen",
		docs: {
			description: {
				component: `
汎用的なリスト表示コンポーネント。フィルタリング、ソート、ページネーション、検索などの機能を統合し、
様々なリスト表示に対応できる柔軟な設計になっています。

## 主な機能

- **URL同期**: フィルター、ソート、ページネーションの状態をURLパラメータと同期
- **柔軟なフィルター**: select, multiselect, range, dateRange など多様なフィルタータイプに対応
- **ソート機能**: 複数フィールドでのソート定義が可能
- **ページネーション**: ページサイズ変更、ページ番号の妥当性チェック付き
- **検索機能**: リアルタイム検索に対応
- **カスタマイズ可能**: レンダリング関数、グリッドレイアウト、フィルターなどを柔軟にカスタマイズ

## 使用方法

\`\`\`tsx
import { GenericList } from "@suzumina.click/ui";
import type { ListConfig, ListParams, ListResult } from "@suzumina.click/ui";

// 設定
const config: ListConfig = {
  title: "商品一覧",
  baseUrl: "/products",
  filters: [
    {
      key: "category",
      type: "select",
      label: "カテゴリー",
      options: [
        { value: "all", label: "すべて" },
        { value: "electronics", label: "家電" },
      ],
      defaultValue: "all",
    },
  ],
  sortOptions: [
    {
      key: "newest",
      label: "新着順",
      fields: [{ field: "createdAt", direction: "desc" }],
    },
  ],
  defaultSort: "newest",
};

// データ取得関数
async function fetchProducts(params: ListParams): Promise<ListResult<Product>> {
  const response = await fetch(\`/api/products?\${new URLSearchParams(params)}\`);
  return response.json();
}

// 使用
<GenericList
  config={config}
  fetchData={fetchProducts}
  renderItem={(product) => <ProductCard product={product} />}
/>
\`\`\`
				`,
			},
		},
	},
} satisfies Meta<typeof GenericList>;

export default meta;
type Story = StoryObj<typeof GenericList>;

// Basic configuration
const basicConfig: ListConfig = {
	title: "作品一覧",
	baseUrl: "/works",
	filters: [
		{
			key: "category",
			type: "select",
			label: "カテゴリー",
			placeholder: "カテゴリーを選択",
			options: [
				{ value: "all", label: "すべて" },
				{ value: "音声作品", label: "音声作品" },
				{ value: "ゲーム", label: "ゲーム" },
				{ value: "CG・イラスト", label: "CG・イラスト" },
				{ value: "マンガ", label: "マンガ" },
			],
			defaultValue: "all",
		},
	],
	sortOptions: [
		{
			key: "newest",
			label: "新着順",
			fields: [{ field: "releaseDate", direction: "desc" }],
		},
		{
			key: "oldest",
			label: "古い順",
			fields: [{ field: "releaseDate", direction: "asc" }],
		},
		{
			key: "popular",
			label: "人気順",
			fields: [{ field: "dlCount", direction: "desc" }],
		},
		{
			key: "priceAsc",
			label: "価格が安い順",
			fields: [{ field: "price", direction: "asc" }],
		},
		{
			key: "priceDesc",
			label: "価格が高い順",
			fields: [{ field: "price", direction: "desc" }],
		},
	],
	defaultSort: "newest",
	paginationConfig: {
		itemsPerPage: 12,
		itemsPerPageOptions: [12, 24, 48],
	},
};

export const Default: Story = {
	parameters: {
		docs: {
			description: {
				story: "基本的な使用例。カテゴリーフィルターとソート機能を備えた作品リストを表示します。",
			},
		},
	},
	args: {
		config: basicConfig,
		fetchData: fetchWorks,
		renderItem: (work: SampleWork) => (
			<div key={work.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
				<h3 className="font-semibold text-lg mb-2">{work.title}</h3>
				<p className="text-sm text-muted-foreground mb-1">{work.circle}</p>
				<p className="text-sm text-muted-foreground mb-2">{work.id}</p>
				<div className="flex flex-wrap gap-1 mb-2">
					{work.tags.map((tag) => (
						<span key={tag} className="px-2 py-1 bg-secondary text-xs rounded">
							{tag}
						</span>
					))}
				</div>
				<div className="flex justify-between items-center text-sm">
					<span className="font-medium">¥{work.price.toLocaleString()}</span>
					<span className="text-muted-foreground">DL: {work.dlCount.toLocaleString()}</span>
				</div>
			</div>
		),
		gridColumns: {
			default: 1,
			md: 2,
			lg: 3,
			xl: 4,
		},
	},
};

export const WithMultipleFilters: Story = {
	parameters: {
		docs: {
			description: {
				story:
					"複数のフィルタータイプの組み合わせ例。カスタムフィルター（価格帯）の実装方法を示します。",
			},
		},
	},
	args: {
		config: {
			...basicConfig,
			filters: [
				...basicConfig.filters,
				{
					key: "priceRange",
					type: "custom",
					label: "価格帯",
					defaultValue: { min: undefined, max: undefined },
				},
			],
		},
		fetchData: fetchWorks,
		renderItem: Default.args.renderItem,
		renderCustomFilters: () => (
			<div className="flex gap-2">
				<input
					type="number"
					placeholder="最低価格"
					className="px-3 py-1 border rounded text-sm"
					onChange={(e) => {
						// In real implementation, this would update the filter
						console.log("Min price:", e.target.value);
					}}
				/>
				<input
					type="number"
					placeholder="最高価格"
					className="px-3 py-1 border rounded text-sm"
					onChange={(e) => {
						// In real implementation, this would update the filter
						console.log("Max price:", e.target.value);
					}}
				/>
			</div>
		),
		gridColumns: Default.args.gridColumns,
	},
};

export const LoadingState: Story = {
	parameters: {
		docs: {
			description: {
				story: "ローディング状態の表示例。カスタムローディングスケルトンを定義できます。",
			},
		},
	},
	args: {
		config: basicConfig,
		fetchData: async () => {
			// Never resolve to show loading state
			await new Promise(() => {});
			return { items: [], totalCount: 0, filteredCount: 0 };
		},
		renderItem: Default.args.renderItem,
		renderLoadingSkeleton: () => (
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
				{Array.from({ length: 6 }).map((_, i) => (
					<div key={i} className="p-4 border rounded-lg">
						<div className="h-6 bg-gray-200 rounded mb-2 animate-pulse" />
						<div className="h-4 bg-gray-200 rounded w-2/3 mb-1 animate-pulse" />
						<div className="h-4 bg-gray-200 rounded w-1/2 mb-2 animate-pulse" />
						<div className="flex gap-1 mb-2">
							<div className="h-6 bg-gray-200 rounded w-16 animate-pulse" />
							<div className="h-6 bg-gray-200 rounded w-16 animate-pulse" />
						</div>
						<div className="flex justify-between">
							<div className="h-4 bg-gray-200 rounded w-20 animate-pulse" />
							<div className="h-4 bg-gray-200 rounded w-16 animate-pulse" />
						</div>
					</div>
				))}
			</div>
		),
	},
};

export const EmptyState: Story = {
	parameters: {
		docs: {
			description: {
				story: "データが空の状態の表示例。カスタム空状態コンポーネントを定義できます。",
			},
		},
	},
	args: {
		config: basicConfig,
		fetchData: async () => ({
			items: [],
			totalCount: 100,
			filteredCount: 0,
		}),
		renderItem: Default.args.renderItem,
		renderEmptyState: () => (
			<div className="text-center py-12">
				<h3 className="text-lg font-semibold mb-2">検索結果がありません</h3>
				<p className="text-muted-foreground mb-4">条件を変更して再度お試しください</p>
				<button
					type="button"
					className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
				>
					フィルターをリセット
				</button>
			</div>
		),
	},
};

export const ErrorState: Story = {
	parameters: {
		docs: {
			description: {
				story: "エラー状態の表示例。データ取得に失敗した場合の処理を示します。",
			},
		},
	},
	args: {
		config: basicConfig,
		fetchData: async () => {
			throw new Error("データの取得に失敗しました");
		},
		renderItem: Default.args.renderItem,
	},
};

export const MinimalConfiguration: Story = {
	parameters: {
		docs: {
			description: {
				story: "最小限の設定での使用例。フィルターやソートなしでシンプルなリストを表示します。",
			},
		},
	},
	args: {
		config: {
			baseUrl: "/items",
		},
		fetchData: async (params) => ({
			items: sampleWorks.slice((params.page - 1) * params.limit, params.page * params.limit),
			totalCount: sampleWorks.length,
			filteredCount: sampleWorks.length,
		}),
		renderItem: (work: SampleWork) => (
			<div key={work.id} className="p-3 border rounded">
				<h4 className="font-medium">{work.title}</h4>
			</div>
		),
	},
};

export const CustomGridLayout: Story = {
	parameters: {
		docs: {
			description: {
				story: "カスタムグリッドレイアウトの例。レスポンシブなグリッド列数を細かく制御できます。",
			},
		},
	},
	args: {
		config: basicConfig,
		fetchData: fetchWorks,
		renderItem: (work: SampleWork) => (
			<div key={work.id} className="p-2 border rounded text-sm">
				<h4 className="font-medium truncate">{work.title}</h4>
				<p className="text-xs text-muted-foreground">¥{work.price}</p>
			</div>
		),
		gridColumns: {
			default: 2,
			sm: 3,
			md: 4,
			lg: 6,
			xl: 8,
		},
	},
};

// Interactive example with state management
function InteractiveExample() {
	const [selectedTags, setSelectedTags] = useState<string[]>([]);

	const interactiveConfig: ListConfig = {
		...basicConfig,
		filters: [
			...basicConfig.filters,
			{
				key: "tags",
				type: "custom",
				label: "タグ",
				defaultValue: [],
			},
		],
	};

	const interactiveFetchData = async (params: ListParams): Promise<ListResult<SampleWork>> => {
		const result = await fetchWorks(params);

		// Additional filtering by tags
		if (selectedTags.length > 0) {
			result.items = result.items.filter((work) =>
				selectedTags.some((tag) => work.tags.includes(tag)),
			);
			result.filteredCount = result.items.length;
		}

		return result;
	};

	return (
		<GenericList<SampleWork>
			config={interactiveConfig}
			fetchData={interactiveFetchData}
			renderItem={(work) => (
				<div key={work.id} className="p-4 border rounded-lg">
					<h3 className="font-semibold">{work.title}</h3>
					<div className="flex flex-wrap gap-1 mt-2">
						{work.tags.map((tag) => (
							<button
								key={tag}
								type="button"
								onClick={() => {
									setSelectedTags((prev) =>
										prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
									);
								}}
								className={`px-2 py-1 text-xs rounded ${
									selectedTags.includes(tag) ? "bg-primary text-primary-foreground" : "bg-secondary"
								}`}
							>
								{tag}
							</button>
						))}
					</div>
				</div>
			)}
			renderCustomFilters={() => (
				<div className="flex flex-wrap gap-1">
					{selectedTags.map((tag) => (
						<span
							key={tag}
							className="px-2 py-1 bg-primary text-primary-foreground text-xs rounded flex items-center gap-1"
						>
							{tag}
							<button
								type="button"
								onClick={() => setSelectedTags((prev) => prev.filter((t) => t !== tag))}
								className="hover:text-primary-foreground/80"
							>
								×
							</button>
						</span>
					))}
				</div>
			)}
		/>
	);
}

export const Interactive: Story = {
	parameters: {
		docs: {
			description: {
				story:
					"インタラクティブな使用例。タグによるフィルタリングなど、より複雑な状態管理の実装例を示します。",
			},
		},
	},
	render: () => <InteractiveExample />,
};
