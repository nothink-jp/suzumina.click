import type { Meta, StoryObj } from "@storybook/react-vite";
import { Badge } from "../ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { ConfigurableList } from "./configurable-list";
import type { FilterConfig, SortConfig, StandardListParams } from "./configurable-list/types";
import { generateYearOptions } from "./configurable-list/utils/filter-helpers";

// サンプルデータの型
interface Product {
	id: number;
	name: string;
	category: string;
	price: number;
	inStock: boolean;
	releaseYear: string;
	rating: number;
	tags: string[];
	createdAt: string;
}

// 視覚回帰(Chromatic)の差分を防ぐため、乱数や現在時刻は使わず index 由来の決定論的な値で生成する
const FIXTURE_BASE_MS = Date.parse("2024-06-01T00:00:00.000Z");

// サンプルデータ生成
const generateProducts = (count: number): Product[] => {
	const categories = ["Electronics", "Books", "Clothing", "Food", "Toys"];
	const tags = ["New", "Sale", "Popular", "Limited", "Exclusive"];

	return Array.from({ length: count }, (_, i) => ({
		id: i + 1,
		name: `Product ${i + 1}`,
		category: categories[i % categories.length],
		price: ((i * 1373) % 9000) + 1000,
		inStock: i % 10 < 7,
		releaseYear: (2020 + (i % 5)).toString(),
		rating: (i % 5) + 1,
		tags: tags.filter((_, t) => (i + t) % 3 === 0),
		createdAt: new Date(FIXTURE_BASE_MS - i * 86400000).toISOString(),
	}));
};

// fetchFn は必須。ストーリー用の擬似サーバー: params（検索/フィルタ/ソート/ページ）に応じて
// 絞り込み・並べ替え・ページングを行い、UI 操作に追従する（旧 client-side パイプラインの再現）。
const compareValues = (a: unknown, b: unknown): number => {
	if (a === undefined && b === undefined) return 0;
	if (a === undefined) return 1;
	if (b === undefined) return -1;
	if (typeof a === "string" && typeof b === "string") return a.localeCompare(b);
	if (typeof a === "number" && typeof b === "number") return a - b;
	return String(a).localeCompare(String(b));
};

const makeFetch =
	<T,>(data: T[]) =>
	async (rawParams: unknown): Promise<{ items: T[]; total: number }> => {
		const params = rawParams as StandardListParams;
		const get = (item: T, key: string) => (item as Record<string, unknown>)[key];
		let result = [...data];
		// 検索（title/name/label/description/text のいずれかの文字列）
		if (params.search) {
			const q = params.search.toLowerCase();
			result = result.filter((item) => {
				const text = ["title", "name", "label", "description", "text"]
					.map((k) => get(item, k))
					.find((v) => typeof v === "string") as string | undefined;
				return text?.toLowerCase().includes(q) ?? false;
			});
		}
		// フィルタ（boolean は true のみ抽出、その他は等値）
		for (const [key, value] of Object.entries(params.filters ?? {})) {
			if (value === undefined || value === "" || value === "all") continue;
			if (typeof value === "boolean") {
				if (value) result = result.filter((item) => Boolean(get(item, key)));
			} else {
				result = result.filter((item) => String(get(item, key)) === String(value));
			}
		}
		// ソート（昇順）
		if (params.sort) {
			const key = params.sort;
			result = [...result].sort((a, b) => compareValues(get(a, key), get(b, key)));
		}
		const total = result.length;
		const start = (params.page - 1) * params.itemsPerPage;
		return { items: result.slice(start, start + params.itemsPerPage), total };
	};

const meta = {
	title: "Custom/List/ConfigurableList",
	component: ConfigurableList,
	parameters: {
		layout: "padded",
	},
} satisfies Meta<typeof ConfigurableList>;

export default meta;
type Story = StoryObj<typeof meta>;

// 商品カードのレンダリング
const renderProduct = (product: Product) => (
	<Card key={product.id}>
		<CardHeader>
			<div className="flex items-start justify-between">
				<div>
					<CardTitle className="text-lg">{product.name}</CardTitle>
					<p className="text-sm text-muted-foreground">{product.category}</p>
				</div>
				<div className="text-right">
					<p className="text-lg font-bold">¥{product.price.toLocaleString()}</p>
					<Badge variant={product.inStock ? "default" : "secondary"}>
						{product.inStock ? "在庫あり" : "在庫なし"}
					</Badge>
				</div>
			</div>
		</CardHeader>
		<CardContent>
			<div className="flex items-center justify-between">
				<div className="flex gap-1">
					{product.tags.map((tag) => (
						<Badge key={tag} variant="outline" className="text-xs">
							{tag}
						</Badge>
					))}
				</div>
				<div className="text-sm text-muted-foreground">評価: {"★".repeat(product.rating)}</div>
			</div>
		</CardContent>
	</Card>
);

// 基本的なフィルター設定
const basicFilters: Record<string, FilterConfig> = {
	category: {
		type: "select",
		options: ["Electronics", "Books", "Clothing", "Food", "Toys"],
		showAll: true,
	},
	inStock: {
		type: "boolean",
	},
};

// ソートオプション
const sortOptions: SortConfig[] = [
	{ value: "createdAt", label: "新着順" },
	{ value: "price", label: "価格順" },
	{ value: "rating", label: "評価順" },
];

export const Basic: Story = {
	args: {
		items: generateProducts(50),
		fetchFn: makeFetch(generateProducts(50)),
		renderItem: renderProduct,
		filters: basicFilters,
		sorts: sortOptions,
		defaultSort: "createdAt",
		itemsPerPage: 12,
	},
};

export const WithYearFilter: Story = {
	args: {
		items: generateProducts(50),
		fetchFn: makeFetch(generateProducts(50)),
		renderItem: renderProduct,
		filters: {
			...basicFilters,
			releaseYear: {
				type: "select",
				options: generateYearOptions(2020, 2024),
				showAll: true,
			},
		},
		sorts: sortOptions,
		defaultSort: "createdAt",
	},
};

export const NoUrlSync: Story = {
	args: {
		items: generateProducts(30),
		fetchFn: makeFetch(generateProducts(30)),
		renderItem: renderProduct,
		filters: basicFilters,
		sorts: sortOptions,
		urlSync: false,
	},
};

export const CustomEmptyMessage: Story = {
	args: {
		items: [],
		fetchFn: makeFetch([]),
		renderItem: renderProduct,
		filters: basicFilters,
		emptyMessage: "商品が見つかりませんでした。条件を変更してお試しください。",
	},
};

export const WithoutSearch: Story = {
	args: {
		items: generateProducts(20),
		fetchFn: makeFetch(generateProducts(20)),
		renderItem: renderProduct,
		filters: basicFilters,
		sorts: sortOptions,
		searchable: false,
	},
};

export const FiltersOnly: Story = {
	args: {
		items: generateProducts(30),
		fetchFn: makeFetch(generateProducts(30)),
		renderItem: renderProduct,
		filters: basicFilters,
		searchable: false,
		sorts: [],
	},
};

// サーバーサイドデータ取得のシミュレーション
const mockFetchProducts = async (params: any) => {
	// APIコールのシミュレーション
	await new Promise((resolve) => setTimeout(resolve, 1000));

	const allProducts = generateProducts(100);
	let filtered = [...allProducts];

	// フィルタリング
	if (params.category && params.category !== "all") {
		filtered = filtered.filter((p) => p.category === params.category);
	}
	if (params.inStock) {
		filtered = filtered.filter((p) => p.inStock);
	}
	if (params.search) {
		filtered = filtered.filter((p) => p.name.toLowerCase().includes(params.search.toLowerCase()));
	}

	// ソート
	if (params.sort) {
		filtered.sort((a, b) => {
			const aVal = a[params.sort as keyof Product];
			const bVal = b[params.sort as keyof Product];
			return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
		});
	}

	// ページネーション
	const start = (params.page - 1) * params.limit;
	const items = filtered.slice(start, start + params.limit);

	return {
		items,
		total: filtered.length,
		totalCount: allProducts.length,
	};
};

export const ServerSideData: Story = {
	args: {
		items: [],
		renderItem: renderProduct,
		filters: basicFilters,
		sorts: sortOptions,
		defaultSort: "createdAt",
		fetchFn: mockFetchProducts,
		dataAdapter: {
			toParams: (params) => ({
				...params,
				limit: params.itemsPerPage,
			}),
			fromResult: (result) => ({
				items: result.items,
				total: result.total,
			}),
		},
	},
};

// エラー状態のデモ
export const WithError: Story = {
	args: {
		items: [],
		fetchFn: makeFetch([]),
		renderItem: renderProduct,
		error: {
			type: "fetch",
			message: "データの取得に失敗しました。しばらく経ってから再度お試しください。",
			retry: () => alert("再試行します"),
		},
	},
};

// カスタムローディングコンポーネント
export const CustomLoading: Story = {
	args: {
		items: [],
		fetchFn: makeFetch([]),
		renderItem: renderProduct,
		loading: true,
		loadingComponent: (
			<div className="flex items-center justify-center py-12">
				<div className="text-center">
					<div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
					<p className="text-muted-foreground">商品を読み込んでいます...</p>
				</div>
			</div>
		),
	},
};

// Flexレイアウトのサンプルデータ（タグやバッジなど）
interface Tag {
	id: number;
	name: string;
	color: string;
	count: number;
}

const generateTags = (count: number): Tag[] => {
	const colors = ["primary", "secondary", "destructive", "outline", "default"] as const;
	const categories = [
		"JavaScript",
		"React",
		"TypeScript",
		"CSS",
		"HTML",
		"Node.js",
		"Vue",
		"Angular",
		"Svelte",
		"Next.js",
	];

	return Array.from({ length: count }, (_, i) => ({
		id: i + 1,
		name: categories[i % categories.length],
		color: colors[i % colors.length],
		count: ((i * 37) % 100) + 1,
	}));
};

// タグのレンダリング（インライン要素として）
const renderTag = (tag: Tag) => (
	<Badge
		key={tag.id}
		variant={tag.color as any}
		className="cursor-pointer hover:scale-105 transition-transform"
	>
		{tag.name} ({tag.count})
	</Badge>
);

export const FlexLayout: Story = {
	args: {
		items: generateTags(50),
		fetchFn: makeFetch(generateTags(50)),
		renderItem: renderTag,
		layout: "flex",
		searchable: true,
		searchPlaceholder: "タグを検索...",
		sorts: [
			{ value: "name", label: "名前順" },
			{ value: "count", label: "使用数順" },
		],
		defaultSort: "count",
		itemsPerPage: 24,
	},
};

// 音声ボタンのようなインタラクティブ要素の例
interface ActionButton {
	id: number;
	label: string;
	icon: string;
	action: string;
}

const generateActionButtons = (count: number): ActionButton[] => {
	const actions = [
		{ label: "再生", icon: "▶️", action: "play" },
		{ label: "停止", icon: "⏹️", action: "stop" },
		{ label: "お気に入り", icon: "⭐", action: "favorite" },
		{ label: "共有", icon: "🔗", action: "share" },
		{ label: "ダウンロード", icon: "⬇️", action: "download" },
	];

	return Array.from({ length: count }, (_, i) => ({
		id: i + 1,
		...actions[i % actions.length],
	}));
};

const renderActionButton = (button: ActionButton) => (
	<button
		key={button.id}
		className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
		onClick={() => alert(`Action: ${button.action}`)}
	>
		<span>{button.icon}</span>
		<span>{button.label}</span>
	</button>
);

export const FlexLayoutWithButtons: Story = {
	args: {
		items: generateActionButtons(30),
		fetchFn: makeFetch(generateActionButtons(30)),
		renderItem: renderActionButton,
		layout: "flex",
		searchable: false,
		itemsPerPage: 20,
		emptyMessage: "ボタンがありません",
	},
};
