import type { Meta, StoryObj } from "@storybook/react";
import { Badge } from "./badge";
import { Button } from "./button";
import {
	Table,
	TableBody,
	TableCaption,
	TableCell,
	TableFooter,
	TableHead,
	TableHeader,
	TableRow,
} from "./table";

const meta = {
	title: "UI/Table",
	component: Table,
	parameters: {
		layout: "padded",
	},
	tags: ["autodocs"],
} satisfies Meta<typeof Table>;

export default meta;
type Story = StoryObj<typeof meta>;

// Sample data for demonstrations
const sampleUsers = [
	{ id: 1, name: "田中太郎", email: "tanaka@example.com", role: "管理者", status: "アクティブ" },
	{ id: 2, name: "佐藤花子", email: "sato@example.com", role: "ユーザー", status: "アクティブ" },
	{
		id: 3,
		name: "鈴木一郎",
		email: "suzuki@example.com",
		role: "モデレーター",
		status: "非アクティブ",
	},
	{
		id: 4,
		name: "高橋美咲",
		email: "takahashi@example.com",
		role: "ユーザー",
		status: "アクティブ",
	},
	{ id: 5, name: "伊藤健太", email: "ito@example.com", role: "ユーザー", status: "保留中" },
];

const sampleProducts = [
	{ id: "PROD-001", name: "音声作品 Vol.1", price: 1200, sales: 150, category: "ASMR" },
	{ id: "PROD-002", name: "ドラマCD シリーズ", price: 2400, sales: 89, category: "ドラマ" },
	{ id: "PROD-003", name: "シチュエーションボイス", price: 800, sales: 234, category: "ボイス" },
	{ id: "PROD-004", name: "バイノーラル録音", price: 1800, sales: 67, category: "ASMR" },
];

export const Basic: Story = {
	render: () => (
		<Table>
			<TableCaption>最近のユーザー一覧</TableCaption>
			<TableHeader>
				<TableRow>
					<TableHead>ID</TableHead>
					<TableHead>名前</TableHead>
					<TableHead>メールアドレス</TableHead>
					<TableHead>ロール</TableHead>
					<TableHead>ステータス</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{sampleUsers.map((user) => (
					<TableRow key={user.id}>
						<TableCell>{user.id}</TableCell>
						<TableCell className="font-medium">{user.name}</TableCell>
						<TableCell>{user.email}</TableCell>
						<TableCell>{user.role}</TableCell>
						<TableCell>
							<Badge variant={user.status === "アクティブ" ? "default" : "secondary"}>
								{user.status}
							</Badge>
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	),
};

export const WithFooter: Story = {
	render: () => (
		<Table>
			<TableCaption>商品売上データ</TableCaption>
			<TableHeader>
				<TableRow>
					<TableHead>商品ID</TableHead>
					<TableHead>商品名</TableHead>
					<TableHead>カテゴリー</TableHead>
					<TableHead className="text-right">価格</TableHead>
					<TableHead className="text-right">売上数</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{sampleProducts.map((product) => (
					<TableRow key={product.id}>
						<TableCell className="font-mono">{product.id}</TableCell>
						<TableCell className="font-medium">{product.name}</TableCell>
						<TableCell>
							<Badge variant="outline">{product.category}</Badge>
						</TableCell>
						<TableCell className="text-right">¥{product.price.toLocaleString()}</TableCell>
						<TableCell className="text-right">{product.sales}</TableCell>
					</TableRow>
				))}
			</TableBody>
			<TableFooter>
				<TableRow>
					<TableCell colSpan={4}>合計</TableCell>
					<TableCell className="text-right font-medium">
						{sampleProducts.reduce((acc, product) => acc + product.sales, 0)} 件
					</TableCell>
				</TableRow>
			</TableFooter>
		</Table>
	),
};

export const WithActions: Story = {
	render: () => (
		<Table>
			<TableCaption>ユーザー管理テーブル</TableCaption>
			<TableHeader>
				<TableRow>
					<TableHead>名前</TableHead>
					<TableHead>メールアドレス</TableHead>
					<TableHead>ロール</TableHead>
					<TableHead>ステータス</TableHead>
					<TableHead className="text-right">アクション</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{sampleUsers.slice(0, 3).map((user) => (
					<TableRow key={user.id}>
						<TableCell className="font-medium">{user.name}</TableCell>
						<TableCell>{user.email}</TableCell>
						<TableCell>{user.role}</TableCell>
						<TableCell>
							<Badge
								variant={
									user.status === "アクティブ"
										? "default"
										: user.status === "非アクティブ"
											? "destructive"
											: "secondary"
								}
							>
								{user.status}
							</Badge>
						</TableCell>
						<TableCell className="text-right">
							<div className="flex justify-end gap-2">
								<Button variant="outline" size="sm">
									編集
								</Button>
								<Button variant="destructive" size="sm">
									削除
								</Button>
							</div>
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	),
};

export const Empty: Story = {
	render: () => (
		<Table>
			<TableCaption>データが見つかりませんでした</TableCaption>
			<TableHeader>
				<TableRow>
					<TableHead>ID</TableHead>
					<TableHead>名前</TableHead>
					<TableHead>メールアドレス</TableHead>
					<TableHead>ステータス</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				<TableRow>
					<TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
						表示するデータがありません
					</TableCell>
				</TableRow>
			</TableBody>
		</Table>
	),
};

export const Compact: Story = {
	render: () => (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead className="h-8 px-2">項目</TableHead>
					<TableHead className="h-8 px-2">値</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				<TableRow>
					<TableCell className="py-1 px-2 font-medium">総ユーザー数</TableCell>
					<TableCell className="py-1 px-2">1,234</TableCell>
				</TableRow>
				<TableRow>
					<TableCell className="py-1 px-2 font-medium">アクティブユーザー</TableCell>
					<TableCell className="py-1 px-2">987</TableCell>
				</TableRow>
				<TableRow>
					<TableCell className="py-1 px-2 font-medium">新規登録（今月）</TableCell>
					<TableCell className="py-1 px-2">45</TableCell>
				</TableRow>
				<TableRow>
					<TableCell className="py-1 px-2 font-medium">総売上</TableCell>
					<TableCell className="py-1 px-2">¥2,345,678</TableCell>
				</TableRow>
			</TableBody>
		</Table>
	),
};

export const Scrollable: Story = {
	render: () => (
		<div className="w-[400px]">
			<Table>
				<TableCaption>横スクロール可能なテーブル</TableCaption>
				<TableHeader>
					<TableRow>
						<TableHead className="min-w-[100px]">ID</TableHead>
						<TableHead className="min-w-[150px]">名前</TableHead>
						<TableHead className="min-w-[200px]">メールアドレス</TableHead>
						<TableHead className="min-w-[120px]">ロール</TableHead>
						<TableHead className="min-w-[100px]">ステータス</TableHead>
						<TableHead className="min-w-[150px]">登録日</TableHead>
						<TableHead className="min-w-[150px]">最終ログイン</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{sampleUsers.map((user) => (
						<TableRow key={user.id}>
							<TableCell>{user.id}</TableCell>
							<TableCell className="font-medium">{user.name}</TableCell>
							<TableCell>{user.email}</TableCell>
							<TableCell>{user.role}</TableCell>
							<TableCell>
								<Badge variant={user.status === "アクティブ" ? "default" : "secondary"}>
									{user.status}
								</Badge>
							</TableCell>
							<TableCell>2024/01/15</TableCell>
							<TableCell>2024/03/20</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	),
};
