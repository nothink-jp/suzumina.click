import type { Meta, StoryObj } from "@storybook/react";
import { Badge } from "../../ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { SimpleList } from "./simple-list";

// サンプルデータの型
interface SampleItem {
	id: number;
	title: string;
	description: string;
	category: string;
	createdAt: string;
	status: "published" | "draft";
}

// サンプルデータ生成
const generateSampleData = (count: number): SampleItem[] => {
	const categories = ["Tech", "Design", "Business", "Marketing"];
	const statuses: ("published" | "draft")[] = ["published", "draft"];

	return Array.from({ length: count }, (_, i) => ({
		id: i + 1,
		title: `アイテム ${i + 1}: ${["最新技術", "デザイン", "ビジネス", "マーケティング"][i % 4]}の記事`,
		description: `これはサンプルアイテム${i + 1}の説明文です。内容は${["技術", "デザイン", "ビジネス", "マーケティング"][i % 4]}に関するものです。`,
		category: categories[i % categories.length],
		createdAt: new Date(Date.now() - i * 86400000).toISOString(), // 1日ずつ過去に
		status: statuses[i % 2],
	}));
};

const meta = {
	title: "Custom/List/SimpleList",
	component: SimpleList,
	parameters: {
		layout: "padded",
	},
	argTypes: {
		itemsPerPage: {
			control: { type: "number", min: 1, max: 50 },
			description: "1ページあたりの表示件数",
		},
		loading: {
			control: "boolean",
			description: "ローディング状態",
		},
		className: {
			control: "text",
			description: "追加のCSSクラス",
		},
	},
} satisfies Meta<typeof SimpleList>;

export default meta;
type Story = StoryObj<typeof meta>;

// アイテムレンダリング関数
const renderSampleItem = (item: SampleItem) => (
	<Card key={item.id}>
		<CardHeader>
			<div className="flex items-start justify-between">
				<CardTitle className="text-lg">{item.title}</CardTitle>
				<Badge variant={item.status === "published" ? "default" : "secondary"}>
					{item.status === "published" ? "公開" : "下書き"}
				</Badge>
			</div>
		</CardHeader>
		<CardContent>
			<p className="mb-2 text-sm text-muted-foreground">{item.description}</p>
			<div className="flex items-center gap-4 text-xs text-muted-foreground">
				<span>カテゴリ: {item.category}</span>
				<span>作成日: {new Date(item.createdAt).toLocaleDateString("ja-JP")}</span>
			</div>
		</CardContent>
	</Card>
);

export const Default: Story = {
	args: {
		items: generateSampleData(25),
		renderItem: renderSampleItem,
		itemsPerPage: 10,
	},
};

export const FewItems: Story = {
	args: {
		items: generateSampleData(5),
		renderItem: renderSampleItem,
		itemsPerPage: 10,
	},
};

export const ManyItems: Story = {
	args: {
		items: generateSampleData(100),
		renderItem: renderSampleItem,
		itemsPerPage: 12,
	},
};

export const Loading: Story = {
	args: {
		items: [],
		renderItem: renderSampleItem,
		loading: true,
	},
};

export const Empty: Story = {
	args: {
		items: [],
		renderItem: renderSampleItem,
	},
};

export const WithError: Story = {
	args: {
		items: [],
		renderItem: renderSampleItem,
		error: {
			type: "fetch",
			message: "データの取得に失敗しました。ネットワーク接続を確認してください。",
			retry: () => alert("再試行します"),
		},
	},
};

// シンプルなリスト表示の例
const renderSimpleItem = (item: { name: string; value: number }) => (
	<div className="flex items-center justify-between rounded-lg border p-4">
		<span className="font-medium">{item.name}</span>
		<span className="text-muted-foreground">{item.value}</span>
	</div>
);

export const SimpleItems: Story = {
	args: {
		items: Array.from({ length: 20 }, (_, i) => ({
			name: `項目 ${i + 1}`,
			value: Math.floor(Math.random() * 1000),
			createdAt: new Date(Date.now() - i * 3600000).toISOString(),
		})),
		renderItem: renderSimpleItem,
		itemsPerPage: 8,
	},
};
