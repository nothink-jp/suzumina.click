import type { Meta, StoryObj } from "@storybook/react";
import { Separator } from "./separator";

const meta: Meta<typeof Separator> = {
	title: "UI/Separator",
	component: Separator,
	parameters: {
		docs: {
			description: {
				component:
					"セパレーターコンポーネント - コンテンツを視覚的に分離するためのシンプルな区切り線",
			},
		},
	},
	argTypes: {
		orientation: {
			control: "select",
			options: ["horizontal", "vertical"],
			description: "セパレーターの方向",
		},
		decorative: {
			control: "boolean",
			description: "装飾的な要素として扱うかどうか",
		},
	},
};

export default meta;
type Story = StoryObj<typeof Separator>;

export const Default: Story = {
	render: () => (
		<div className="space-y-4">
			<p className="text-sm">上のコンテンツ</p>
			<Separator />
			<p className="text-sm">下のコンテンツ</p>
		</div>
	),
};

export const Horizontal: Story = {
	render: () => (
		<div className="w-full max-w-md space-y-4">
			<div className="space-y-1">
				<h4 className="text-sm font-medium leading-none">セクション1</h4>
				<p className="text-sm text-muted-foreground">
					最初のセクションの内容です。
				</p>
			</div>
			<Separator className="my-4" />
			<div className="space-y-1">
				<h4 className="text-sm font-medium leading-none">セクション2</h4>
				<p className="text-sm text-muted-foreground">
					2番目のセクションの内容です。
				</p>
			</div>
		</div>
	),
};

export const Vertical: Story = {
	render: () => (
		<div className="flex h-20 items-center space-x-4 text-sm">
			<div>左のコンテンツ</div>
			<Separator orientation="vertical" />
			<div>中央のコンテンツ</div>
			<Separator orientation="vertical" />
			<div>右のコンテンツ</div>
		</div>
	),
};

export const InNavigation: Story = {
	render: () => (
		<div className="flex h-12 items-center space-x-4 text-sm">
			<a href="#" className="font-medium text-foreground">
				ホーム
			</a>
			<Separator orientation="vertical" />
			<a href="#" className="text-muted-foreground hover:text-foreground">
				音声ボタン
			</a>
			<Separator orientation="vertical" />
			<a href="#" className="text-muted-foreground hover:text-foreground">
				動画一覧
			</a>
			<Separator orientation="vertical" />
			<a href="#" className="text-muted-foreground hover:text-foreground">
				作品一覧
			</a>
		</div>
	),
};

export const InCardLayout: Story = {
	render: () => (
		<div className="rounded-lg border p-6 shadow-sm">
			<div className="space-y-4">
				<div>
					<h3 className="text-lg font-semibold">音声ボタン情報</h3>
					<p className="text-sm text-muted-foreground">
						音声ボタンの詳細情報を表示します
					</p>
				</div>
				
				<Separator />
				
				<div className="grid grid-cols-2 gap-4 text-sm">
					<div>
						<span className="font-medium">タイトル:</span>
						<span className="ml-2 text-muted-foreground">おはよう！</span>
					</div>
					<div>
						<span className="font-medium">カテゴリ:</span>
						<span className="ml-2 text-muted-foreground">挨拶</span>
					</div>
				</div>
				
				<Separator />
				
				<div className="text-sm">
					<span className="font-medium">説明:</span>
					<p className="mt-1 text-muted-foreground">
						朝の挨拶に使える元気いっぱいの音声ボタンです。
					</p>
				</div>
				
				<Separator />
				
				<div className="flex items-center justify-between text-sm">
					<span className="text-muted-foreground">作成日: 2024年12月25日</span>
					<span className="text-muted-foreground">再生回数: 1,234回</span>
				</div>
			</div>
		</div>
	),
};

export const InSidebar: Story = {
	render: () => (
		<div className="w-64 h-96 border rounded-lg bg-card">
			<div className="p-4">
				<h3 className="text-sm font-semibold">メニュー</h3>
			</div>
			
			<Separator />
			
			<div className="p-2 space-y-1">
				<a href="#" className="block px-2 py-1.5 text-sm rounded hover:bg-accent">
					ダッシュボード
				</a>
				<a href="#" className="block px-2 py-1.5 text-sm rounded hover:bg-accent">
					音声ボタン
				</a>
				<a href="#" className="block px-2 py-1.5 text-sm rounded hover:bg-accent">
					動画一覧
				</a>
			</div>
			
			<Separator />
			
			<div className="p-2 space-y-1">
				<a href="#" className="block px-2 py-1.5 text-sm rounded hover:bg-accent">
					設定
				</a>
				<a href="#" className="block px-2 py-1.5 text-sm rounded hover:bg-accent">
					ヘルプ
				</a>
			</div>
			
			<Separator />
			
			<div className="p-2">
				<a href="#" className="block px-2 py-1.5 text-sm rounded hover:bg-accent text-red-600">
					ログアウト
				</a>
			</div>
		</div>
	),
};

export const InFormLayout: Story = {
	render: () => (
		<div className="max-w-md space-y-6">
			<div className="space-y-4">
				<h2 className="text-lg font-semibold">アカウント設定</h2>
				
				<div className="space-y-2">
					<label className="text-sm font-medium">ユーザー名</label>
					<input 
						type="text" 
						className="w-full px-3 py-2 border rounded-md text-sm" 
						defaultValue="user123"
					/>
				</div>
				
				<div className="space-y-2">
					<label className="text-sm font-medium">メールアドレス</label>
					<input 
						type="email" 
						className="w-full px-3 py-2 border rounded-md text-sm" 
						defaultValue="user@example.com"
					/>
				</div>
			</div>
			
			<Separator />
			
			<div className="space-y-4">
				<h3 className="text-base font-medium">プライバシー設定</h3>
				
				<div className="space-y-2">
					<label className="flex items-center space-x-2">
						<input type="checkbox" className="rounded" />
						<span className="text-sm">プロフィールを公開する</span>
					</label>
					<label className="flex items-center space-x-2">
						<input type="checkbox" className="rounded" />
						<span className="text-sm">アクティビティを表示する</span>
					</label>
				</div>
			</div>
			
			<Separator />
			
			<div className="flex justify-end space-x-2">
				<button className="px-4 py-2 text-sm border rounded-md hover:bg-accent">
					キャンセル
				</button>
				<button className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
					保存
				</button>
			</div>
		</div>
	),
};

export const CustomStyling: Story = {
	render: () => (
		<div className="space-y-8">
			<div className="space-y-4">
				<h3 className="font-medium">デフォルト</h3>
				<Separator />
			</div>
			
			<div className="space-y-4">
				<h3 className="font-medium">カスタムカラー (suzuka)</h3>
				<Separator className="bg-suzuka-500" />
			</div>
			
			<div className="space-y-4">
				<h3 className="font-medium">太い線</h3>
				<Separator className="h-[2px]" />
			</div>
			
			<div className="space-y-4">
				<h3 className="font-medium">点線</h3>
				<Separator className="border-t border-dashed bg-transparent h-0" />
			</div>
			
			<div className="space-y-4">
				<h3 className="font-medium">グラデーション</h3>
				<Separator className="bg-gradient-to-r from-suzuka-500 to-minase-500 h-[2px]" />
			</div>
		</div>
	),
};