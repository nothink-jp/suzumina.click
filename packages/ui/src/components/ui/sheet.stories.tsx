import type { Meta, StoryObj } from "@storybook/react";
import { Home, LogOut, Menu, Settings, Users } from "lucide-react";
import { Button } from "./button";
import { Separator } from "./separator";
import {
	Sheet,
	SheetClose,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "./sheet";

const meta: Meta<typeof Sheet> = {
	title: "UI/Sheet",
	component: Sheet,
	parameters: {
		docs: {
			description: {
				component:
					"シートコンポーネント - モバイルメニューやサイドパネルに最適なスライドアウトコンポーネント",
			},
		},
	},
};

export default meta;
type Story = StoryObj<typeof Sheet>;

export const Default: Story = {
	render: () => (
		<Sheet>
			<SheetTrigger asChild>
				<Button variant="outline">シートを開く</Button>
			</SheetTrigger>
			<SheetContent>
				<SheetHeader>
					<SheetTitle>シートのタイトル</SheetTitle>
					<SheetDescription>
						ここにシートの説明を記載します。このシートはサイドパネルとして機能します。
					</SheetDescription>
				</SheetHeader>
				<div className="py-4">
					<p className="text-sm text-muted-foreground">
						シートの内容をここに配置します。メニューやフォーム、詳細情報などを表示できます。
					</p>
				</div>
				<SheetFooter>
					<SheetClose asChild>
						<Button type="button" variant="secondary">
							閉じる
						</Button>
					</SheetClose>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	),
};

export const LeftSide: Story = {
	render: () => (
		<Sheet>
			<SheetTrigger asChild>
				<Button variant="outline">左からシートを開く</Button>
			</SheetTrigger>
			<SheetContent side="left">
				<SheetHeader>
					<SheetTitle>左側シート</SheetTitle>
					<SheetDescription>左側からスライドインするシートです。</SheetDescription>
				</SheetHeader>
				<div className="py-4">
					<p className="text-sm">左側からのスライドアニメーションが確認できます。</p>
				</div>
			</SheetContent>
		</Sheet>
	),
};

export const TopSide: Story = {
	render: () => (
		<Sheet>
			<SheetTrigger asChild>
				<Button variant="outline">上からシートを開く</Button>
			</SheetTrigger>
			<SheetContent side="top">
				<SheetHeader>
					<SheetTitle>上部シート</SheetTitle>
					<SheetDescription>上部からスライドダウンするシートです。</SheetDescription>
				</SheetHeader>
				<div className="py-4">
					<p className="text-sm">通知やアラートの表示に適しています。</p>
				</div>
			</SheetContent>
		</Sheet>
	),
};

export const BottomSide: Story = {
	render: () => (
		<Sheet>
			<SheetTrigger asChild>
				<Button variant="outline">下からシートを開く</Button>
			</SheetTrigger>
			<SheetContent side="bottom">
				<SheetHeader>
					<SheetTitle>下部シート</SheetTitle>
					<SheetDescription>下部からスライドアップするシートです。</SheetDescription>
				</SheetHeader>
				<div className="py-4">
					<p className="text-sm">モバイルでのアクションシートとして活用できます。</p>
				</div>
			</SheetContent>
		</Sheet>
	),
};

export const MobileMenu: Story = {
	render: () => (
		<Sheet>
			<SheetTrigger asChild>
				<Button variant="outline" size="icon">
					<Menu className="h-4 w-4" />
				</Button>
			</SheetTrigger>
			<SheetContent side="left">
				<SheetHeader>
					<SheetTitle>suzumina.click</SheetTitle>
					<SheetDescription>涼花みなせファンサイト</SheetDescription>
				</SheetHeader>
				<div className="py-4 space-y-4">
					<div className="space-y-2">
						<Button variant="ghost" className="w-full justify-start" asChild>
							<a href="#">
								<Home className="mr-2 h-4 w-4" />
								ホーム
							</a>
						</Button>
						<Button variant="ghost" className="w-full justify-start" asChild>
							<a href="#">
								<Users className="mr-2 h-4 w-4" />
								音声ボタン
							</a>
						</Button>
						<Button variant="ghost" className="w-full justify-start" asChild>
							<a href="#">
								<Settings className="mr-2 h-4 w-4" />
								動画一覧
							</a>
						</Button>
						<Button variant="ghost" className="w-full justify-start" asChild>
							<a href="#">
								<Settings className="mr-2 h-4 w-4" />
								作品一覧
							</a>
						</Button>
					</div>
					<Separator />
					<div className="space-y-2">
						<Button variant="ghost" className="w-full justify-start" asChild>
							<a href="#">
								<Settings className="mr-2 h-4 w-4" />
								設定
							</a>
						</Button>
						<Button variant="ghost" className="w-full justify-start" asChild>
							<a href="#">
								<LogOut className="mr-2 h-4 w-4" />
								ログアウト
							</a>
						</Button>
					</div>
				</div>
			</SheetContent>
		</Sheet>
	),
};

export const FormSheet: Story = {
	render: () => (
		<Sheet>
			<SheetTrigger asChild>
				<Button>フォームシートを開く</Button>
			</SheetTrigger>
			<SheetContent>
				<SheetHeader>
					<SheetTitle>音声ボタンを作成</SheetTitle>
					<SheetDescription>
						新しい音声ボタンを作成します。必要な情報を入力してください。
					</SheetDescription>
				</SheetHeader>
				<div className="py-4 space-y-4">
					<div className="space-y-2">
						<label htmlFor="button-title" className="text-sm font-medium">
							タイトル
						</label>
						<input
							id="button-title"
							type="text"
							placeholder="音声ボタンのタイトル"
							className="w-full px-3 py-2 border border-input rounded-md text-sm"
						/>
					</div>
					<div className="space-y-2">
						<label htmlFor="button-description" className="text-sm font-medium">
							説明
						</label>
						<textarea
							id="button-description"
							placeholder="音声ボタンの説明"
							rows={3}
							className="w-full px-3 py-2 border border-input rounded-md text-sm resize-none"
						/>
					</div>
					<div className="space-y-2">
						<label htmlFor="button-category" className="text-sm font-medium">
							カテゴリ
						</label>
						<select
							id="button-category"
							className="w-full px-3 py-2 border border-input rounded-md text-sm"
						>
							<option value="">カテゴリを選択</option>
							<option value="greeting">挨拶</option>
							<option value="reaction">リアクション</option>
							<option value="singing">歌</option>
							<option value="other">その他</option>
						</select>
					</div>
				</div>
				<SheetFooter>
					<SheetClose asChild>
						<Button type="button" variant="outline">
							キャンセル
						</Button>
					</SheetClose>
					<Button type="button">作成</Button>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	),
};

export const WithoutHeaderFooter: Story = {
	render: () => (
		<Sheet>
			<SheetTrigger asChild>
				<Button variant="outline">シンプルシート</Button>
			</SheetTrigger>
			<SheetContent>
				<div className="p-4">
					<h2 className="text-lg font-semibold mb-4">シンプルなシート</h2>
					<p className="text-sm text-muted-foreground mb-4">
						ヘッダーとフッターを使わないシンプルなレイアウトです。
					</p>
					<div className="space-y-2">
						<Button variant="ghost" className="w-full justify-start">
							メニュー項目 1
						</Button>
						<Button variant="ghost" className="w-full justify-start">
							メニュー項目 2
						</Button>
						<Button variant="ghost" className="w-full justify-start">
							メニュー項目 3
						</Button>
					</div>
				</div>
			</SheetContent>
		</Sheet>
	),
};
