import type { Meta, StoryObj } from "@storybook/react-vite";
import { FileText, Plus, Search, Users, Video } from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import {
	ListPageContent,
	ListPageGrid,
	ListPageHeader,
	ListPageLayout,
	ListPageStats,
} from "./list-page-layout";

const meta: Meta<typeof ListPageLayout> = {
	title: "Custom/Layout/ListPageLayout",
	component: ListPageLayout,
	parameters: {
		layout: "fullscreen",
		docs: {
			description: {
				component:
					"リストページ用の統一されたレイアウトコンポーネント群。各種リスト表示ページのベースとして使用します。",
			},
		},
	},
};

export default meta;
type Story = StoryObj<typeof ListPageLayout>;

// サンプルカードコンポーネント
const SampleCard = ({ title, description }: { title: string; description: string }) => (
	<Card>
		<CardHeader>
			<CardTitle className="text-lg">{title}</CardTitle>
		</CardHeader>
		<CardContent>
			<p className="text-gray-600">{description}</p>
			<div className="mt-4 flex gap-2">
				<Badge variant="secondary">タグ1</Badge>
				<Badge variant="outline">タグ2</Badge>
			</div>
		</CardContent>
	</Card>
);

export const BasicLayout: Story = {
	render: () => (
		<ListPageLayout>
			<ListPageHeader
				title="基本レイアウト"
				description="最もシンプルなリストページの構成例です。"
			/>
			<ListPageContent>
				<div className="text-center py-8">
					<p className="text-gray-600">ここにコンテンツが配置されます</p>
				</div>
			</ListPageContent>
		</ListPageLayout>
	),
	parameters: {
		docs: {
			description: {
				story: "最もシンプルなリストページレイアウトの例",
			},
		},
	},
};

export const VideoListExample: Story = {
	render: () => (
		<ListPageLayout>
			<ListPageHeader title="動画一覧" description="涼花みなせの動画コンテンツ一覧ページです。">
				<Button>
					<Plus className="h-4 w-4 mr-2" />
					新規追加
				</Button>
			</ListPageHeader>
			<ListPageContent>
				<ListPageGrid>
					{Array.from({ length: 8 }, (_, i) => (
						<SampleCard
							key={i}
							title={`動画タイトル ${i + 1}`}
							description="動画の説明文がここに表示されます。YouTube動画の詳細情報です。"
						/>
					))}
				</ListPageGrid>
			</ListPageContent>
		</ListPageLayout>
	),
	parameters: {
		docs: {
			description: {
				story:
					"動画一覧ページでの使用例。ヘッダーにアクションボタンを配置し、グリッドレイアウトでコンテンツを表示",
			},
		},
	},
};

export const AudioButtonListExample: Story = {
	render: () => (
		<ListPageLayout>
			<ListPageHeader title="音声ボタン一覧" description="ユーザーが作成した音声ボタンの一覧です。">
				<div className="flex gap-2">
					<Button variant="outline">
						<Search className="h-4 w-4 mr-2" />
						詳細検索
					</Button>
					<Button>
						<Plus className="h-4 w-4 mr-2" />
						音声追加
					</Button>
				</div>
			</ListPageHeader>
			<ListPageContent>
				<ListPageGrid
					columns={{
						default: 1,
						sm: 2,
						md: 3,
						lg: 4,
						xl: 5,
					}}
				>
					{Array.from({ length: 15 }, (_, i) => (
						<Card key={i} className="text-center">
							<CardContent className="pt-6">
								<div className="w-12 h-12 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
									<Video className="h-6 w-6 text-blue-600" />
								</div>
								<h2 className="font-medium mb-2">音声ボタン {i + 1}</h2>
								<p className="text-sm text-gray-600 mb-4">短い音声の説明</p>
								<Button size="sm" className="w-full">
									再生
								</Button>
							</CardContent>
						</Card>
					))}
				</ListPageGrid>
			</ListPageContent>
		</ListPageLayout>
	),
	parameters: {
		docs: {
			description: {
				story:
					"音声ボタン一覧ページの例。カスタムグリッドカラム設定を使用し、多数のアイテムを効率的に表示",
			},
		},
	},
};

export const WorkListExample: Story = {
	render: () => (
		<ListPageLayout>
			<ListPageHeader title="作品一覧" description="DLsiteの作品情報一覧です。">
				<Button variant="outline">
					<FileText className="h-4 w-4 mr-2" />
					作品データ更新
				</Button>
			</ListPageHeader>
			<ListPageContent>
				<ListPageGrid
					columns={{
						default: 1,
						md: 2,
						xl: 3,
					}}
				>
					{Array.from({ length: 6 }, (_, i) => (
						<Card key={i}>
							<CardHeader>
								<div className="flex items-start justify-between">
									<CardTitle className="text-lg">作品タイトル {i + 1}</CardTitle>
									<Badge variant="secondary">ボイス・ASMR</Badge>
								</div>
							</CardHeader>
							<CardContent>
								<p className="text-gray-600 mb-4">
									作品の詳細説明がここに表示されます。DLsiteから取得した作品情報です。
								</p>
								<div className="flex items-center justify-between">
									<span className="text-lg font-semibold text-blue-600">¥1,320</span>
									<div className="flex items-center gap-1">
										<Users className="h-4 w-4 text-gray-400" />
										<span className="text-sm text-gray-600">128 DL</span>
									</div>
								</div>
							</CardContent>
						</Card>
					))}
				</ListPageGrid>
			</ListPageContent>
		</ListPageLayout>
	),
	parameters: {
		docs: {
			description: {
				story: "作品一覧ページの例。価格やダウンロード数などの詳細情報を含むカードレイアウト",
			},
		},
	},
};

export const WithPagination: Story = {
	render: () => (
		<ListPageLayout>
			<ListPageHeader title="ページネーション付きリスト" description="大量データの表示例です。" />
			<ListPageContent>
				<ListPageGrid>
					{Array.from({ length: 12 }, (_, i) => (
						<SampleCard
							key={i}
							title={`アイテム ${i + 1}`}
							description="リストアイテムの説明文です。"
						/>
					))}
				</ListPageGrid>
				<div className="mt-8">
					<ListPageStats currentPage={2} totalPages={15} totalCount={180} itemsPerPage={12} />
				</div>
			</ListPageContent>
		</ListPageLayout>
	),
	parameters: {
		docs: {
			description: {
				story: "ページネーション情報を表示するパターン。ListPageStatsコンポーネントを使用",
			},
		},
	},
};

export const AdminListExample: Story = {
	render: () => (
		<ListPageLayout>
			<ListPageHeader title="管理者画面" description="システム管理用のリスト表示です。">
				<div className="flex gap-2">
					<Button variant="outline">エクスポート</Button>
					<Button variant="outline">一括操作</Button>
					<Button>
						<Plus className="h-4 w-4 mr-2" />
						新規追加
					</Button>
				</div>
			</ListPageHeader>
			<ListPageContent>
				<ListPageGrid
					columns={{
						default: 1,
						lg: 2,
					}}
				>
					{Array.from({ length: 8 }, (_, i) => (
						<Card key={i}>
							<CardHeader>
								<div className="flex items-center justify-between">
									<CardTitle className="text-lg">管理項目 {i + 1}</CardTitle>
									<Badge variant={i % 2 === 0 ? "default" : "secondary"}>
										{i % 2 === 0 ? "アクティブ" : "保留中"}
									</Badge>
								</div>
							</CardHeader>
							<CardContent>
								<p className="text-gray-600 mb-4">管理項目の詳細情報がここに表示されます。</p>
								<div className="flex gap-2">
									<Button size="sm" variant="outline">
										編集
									</Button>
									<Button size="sm" variant="outline">
										削除
									</Button>
								</div>
							</CardContent>
						</Card>
					))}
				</ListPageGrid>
				<div className="mt-8 flex justify-between items-center">
					<ListPageStats currentPage={1} totalPages={5} totalCount={40} itemsPerPage={8} />
					<div className="text-sm text-gray-600">最終更新: 2024年1月15日</div>
				</div>
			</ListPageContent>
		</ListPageLayout>
	),
	parameters: {
		docs: {
			description: {
				story: "管理者画面での使用例。複数のアクションボタンと状態表示を含む複雑なレイアウト",
			},
		},
	},
};

export const ComponentsShowcase: Story = {
	render: () => (
		<ListPageLayout className="bg-gradient-to-br from-blue-50 to-indigo-50">
			<ListPageHeader
				title="コンポーネント一覧"
				description="ListPageLayoutの各コンポーネントの使用例を紹介します。"
			>
				<Badge variant="outline" className="text-blue-600 border-blue-600">
					デモ
				</Badge>
			</ListPageHeader>
			<ListPageContent>
				<div className="space-y-8">
					<div>
						<h2 className="text-lg font-semibold mb-4">ListPageGrid - デフォルト設定</h2>
						<ListPageGrid>
							{Array.from({ length: 4 }, (_, i) => (
								<div key={i} className="bg-white p-4 rounded-lg border text-center">
									<div className="w-8 h-8 mx-auto mb-2 bg-blue-100 rounded-full flex items-center justify-center">
										{i + 1}
									</div>
									<p className="text-sm">グリッドアイテム {i + 1}</p>
								</div>
							))}
						</ListPageGrid>
					</div>

					<div>
						<h2 className="text-lg font-semibold mb-4">ListPageStats - 統計情報</h2>
						<div className="bg-white p-4 rounded-lg border">
							<ListPageStats currentPage={3} totalPages={12} totalCount={144} itemsPerPage={12} />
						</div>
					</div>
				</div>
			</ListPageContent>
		</ListPageLayout>
	),
	parameters: {
		docs: {
			description: {
				story: "各サブコンポーネントの機能とスタイリングを一覧で確認できるショーケース",
			},
		},
	},
};

// 個別コンポーネントのストーリー
const headerMeta: Meta<typeof ListPageHeader> = {
	title: "Custom/Layout/ListPageHeader",
	component: ListPageHeader,
	parameters: {
		layout: "padded",
	},
};

type HeaderStory = StoryObj<typeof ListPageHeader>;

export const HeaderDefault: HeaderStory = {
	...headerMeta,
	args: {
		title: "ページタイトル",
		description: "ページの説明文がここに表示されます。",
	},
};

export const HeaderWithActions: HeaderStory = {
	...headerMeta,
	args: {
		title: "アクション付きヘッダー",
		description: "ボタンなどのアクション要素を配置できます。",
		children: (
			<div className="flex gap-2">
				<Button variant="outline">セカンダリ</Button>
				<Button>プライマリ</Button>
			</div>
		),
	},
};

const gridMeta: Meta<typeof ListPageGrid> = {
	title: "Custom/Layout/ListPageGrid",
	component: ListPageGrid,
	parameters: {
		layout: "padded",
	},
};

type GridStory = StoryObj<typeof ListPageGrid>;

export const GridDefault: GridStory = {
	...gridMeta,
	render: () => (
		<ListPageGrid>
			{Array.from({ length: 6 }, (_, i) => (
				<div key={i} className="bg-gray-100 p-4 rounded text-center">
					アイテム {i + 1}
				</div>
			))}
		</ListPageGrid>
	),
};

export const GridCustomColumns: GridStory = {
	...gridMeta,
	render: () => (
		<ListPageGrid
			columns={{
				default: 1,
				sm: 2,
				md: 3,
				lg: 4,
				xl: 6,
			}}
		>
			{Array.from({ length: 12 }, (_, i) => (
				<div key={i} className="bg-gray-100 p-2 rounded text-center text-sm">
					{i + 1}
				</div>
			))}
		</ListPageGrid>
	),
};
