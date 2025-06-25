import type { Meta, StoryObj } from "@storybook/react";
import { 
	User, 
	Settings, 
	LogOut, 
	MoreHorizontal, 
	Plus,
	Mail,
	Phone,
	CreditCard,
	UserPlus,
	Users,
	Cloud,
	Github,
	LifeBuoy,
	Keyboard,
	ChevronRight
} from "lucide-react";
import { Button } from "./button";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuShortcut,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from "./dropdown-menu";

const meta: Meta<typeof DropdownMenu> = {
	title: "UI/Dropdown Menu",
	component: DropdownMenu,
	parameters: {
		docs: {
			description: {
				component:
					"ドロップダウンメニューコンポーネント - ユーザーメニューやアクションメニューに最適",
			},
		},
	},
};

export default meta;
type Story = StoryObj<typeof DropdownMenu>;

export const Default: Story = {
	render: () => (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="outline">メニューを開く</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent className="w-56">
				<DropdownMenuLabel>アカウント</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuItem>
					<User className="mr-2 h-4 w-4" />
					<span>プロフィール</span>
				</DropdownMenuItem>
				<DropdownMenuItem>
					<Settings className="mr-2 h-4 w-4" />
					<span>設定</span>
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem>
					<LogOut className="mr-2 h-4 w-4" />
					<span>ログアウト</span>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	),
};

export const WithShortcuts: Story = {
	render: () => (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="outline">ショートカット付きメニュー</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent className="w-56">
				<DropdownMenuLabel>アクション</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuItem>
					<Plus className="mr-2 h-4 w-4" />
					<span>新規作成</span>
					<DropdownMenuShortcut>⌘N</DropdownMenuShortcut>
				</DropdownMenuItem>
				<DropdownMenuItem>
					<Settings className="mr-2 h-4 w-4" />
					<span>設定</span>
					<DropdownMenuShortcut>⌘,</DropdownMenuShortcut>
				</DropdownMenuItem>
				<DropdownMenuItem>
					<Keyboard className="mr-2 h-4 w-4" />
					<span>キーボードショートカット</span>
					<DropdownMenuShortcut>⌘K</DropdownMenuShortcut>
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem>
					<LogOut className="mr-2 h-4 w-4" />
					<span>ログアウト</span>
					<DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	),
};

export const WithCheckboxes: Story = {
	render: () => (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="outline">表示設定</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent className="w-56">
				<DropdownMenuLabel>表示オプション</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuCheckboxItem checked>
					サイドバーを表示
				</DropdownMenuCheckboxItem>
				<DropdownMenuCheckboxItem checked={false}>
					ツールバーを表示
				</DropdownMenuCheckboxItem>
				<DropdownMenuCheckboxItem checked>
					ステータスバーを表示
				</DropdownMenuCheckboxItem>
				<DropdownMenuSeparator />
				<DropdownMenuCheckboxItem checked={false}>
					全画面モード
				</DropdownMenuCheckboxItem>
			</DropdownMenuContent>
		</DropdownMenu>
	),
};

export const WithRadioGroup: Story = {
	render: () => (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="outline">テーマ設定</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent className="w-56">
				<DropdownMenuLabel>テーマ</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuRadioGroup value="light">
					<DropdownMenuRadioItem value="light">
						ライトテーマ
					</DropdownMenuRadioItem>
					<DropdownMenuRadioItem value="dark">
						ダークテーマ
					</DropdownMenuRadioItem>
					<DropdownMenuRadioItem value="system">
						システムに従う
					</DropdownMenuRadioItem>
				</DropdownMenuRadioGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	),
};

export const WithSubmenus: Story = {
	render: () => (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="outline">サブメニュー付き</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent className="w-56">
				<DropdownMenuLabel>マイアカウント</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuGroup>
					<DropdownMenuItem>
						<User className="mr-2 h-4 w-4" />
						<span>プロフィール</span>
					</DropdownMenuItem>
					<DropdownMenuItem>
						<CreditCard className="mr-2 h-4 w-4" />
						<span>請求</span>
					</DropdownMenuItem>
					<DropdownMenuItem>
						<Settings className="mr-2 h-4 w-4" />
						<span>設定</span>
					</DropdownMenuItem>
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<DropdownMenuGroup>
					<DropdownMenuItem>
						<Users className="mr-2 h-4 w-4" />
						<span>チーム</span>
					</DropdownMenuItem>
					<DropdownMenuSub>
						<DropdownMenuSubTrigger>
							<UserPlus className="mr-2 h-4 w-4" />
							<span>ユーザーを招待</span>
						</DropdownMenuSubTrigger>
						<DropdownMenuSubContent>
							<DropdownMenuItem>
								<Mail className="mr-2 h-4 w-4" />
								<span>メール</span>
							</DropdownMenuItem>
							<DropdownMenuItem>
								<Phone className="mr-2 h-4 w-4" />
								<span>SMS</span>
							</DropdownMenuItem>
						</DropdownMenuSubContent>
					</DropdownMenuSub>
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<DropdownMenuItem>
					<Github className="mr-2 h-4 w-4" />
					<span>GitHub</span>
				</DropdownMenuItem>
				<DropdownMenuItem>
					<LifeBuoy className="mr-2 h-4 w-4" />
					<span>サポート</span>
				</DropdownMenuItem>
				<DropdownMenuItem disabled>
					<Cloud className="mr-2 h-4 w-4" />
					<span>API</span>
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<DropdownMenuItem>
					<LogOut className="mr-2 h-4 w-4" />
					<span>ログアウト</span>
					<DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	),
};

export const UserMenu: Story = {
	render: () => (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" className="relative h-8 w-8 rounded-full">
					<div className="h-8 w-8 rounded-full bg-suzuka-500 flex items-center justify-center text-white text-sm font-medium">
						U
					</div>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent className="w-56" align="end" forceMount>
				<DropdownMenuLabel className="font-normal">
					<div className="flex flex-col space-y-1">
						<p className="text-sm font-medium leading-none">ユーザー名</p>
						<p className="text-xs leading-none text-muted-foreground">
							user@example.com
						</p>
					</div>
				</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuGroup>
					<DropdownMenuItem>
						<User className="mr-2 h-4 w-4" />
						<span>プロフィール</span>
						<DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
					</DropdownMenuItem>
					<DropdownMenuItem>
						<CreditCard className="mr-2 h-4 w-4" />
						<span>課金設定</span>
						<DropdownMenuShortcut>⌘B</DropdownMenuShortcut>
					</DropdownMenuItem>
					<DropdownMenuItem>
						<Settings className="mr-2 h-4 w-4" />
						<span>設定</span>
						<DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
					</DropdownMenuItem>
				</DropdownMenuGroup>
				<DropdownMenuSeparator />
				<DropdownMenuItem>
					<LogOut className="mr-2 h-4 w-4" />
					<span>ログアウト</span>
					<DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	),
};

export const ContextMenu: Story = {
	render: () => (
		<div className="flex flex-col items-center space-y-4">
			<p className="text-sm text-muted-foreground">
				音声ボタンのコンテキストメニュー例
			</p>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button variant="outline" size="icon">
						<MoreHorizontal className="h-4 w-4" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					<DropdownMenuItem>
						<span>再生</span>
					</DropdownMenuItem>
					<DropdownMenuItem>
						<span>お気に入りに追加</span>
					</DropdownMenuItem>
					<DropdownMenuItem>
						<span>シェア</span>
					</DropdownMenuItem>
					<DropdownMenuSeparator />
					<DropdownMenuItem>
						<span>編集</span>
					</DropdownMenuItem>
					<DropdownMenuItem variant="destructive">
						<span>削除</span>
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</div>
	),
};

export const StatusMenu: Story = {
	render: () => (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="outline">
					<div className="flex items-center space-x-2">
						<div className="w-2 h-2 bg-green-500 rounded-full"></div>
						<span>オンライン</span>
						<ChevronRight className="h-4 w-4 rotate-90" />
					</div>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent className="w-56">
				<DropdownMenuLabel>ステータス</DropdownMenuLabel>
				<DropdownMenuSeparator />
				<DropdownMenuRadioGroup value="online">
					<DropdownMenuRadioItem value="online">
						<div className="flex items-center space-x-2">
							<div className="w-2 h-2 bg-green-500 rounded-full"></div>
							<span>オンライン</span>
						</div>
					</DropdownMenuRadioItem>
					<DropdownMenuRadioItem value="away">
						<div className="flex items-center space-x-2">
							<div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
							<span>離席中</span>
						</div>
					</DropdownMenuRadioItem>
					<DropdownMenuRadioItem value="busy">
						<div className="flex items-center space-x-2">
							<div className="w-2 h-2 bg-red-500 rounded-full"></div>
							<span>取り込み中</span>
						</div>
					</DropdownMenuRadioItem>
					<DropdownMenuRadioItem value="offline">
						<div className="flex items-center space-x-2">
							<div className="w-2 h-2 bg-gray-500 rounded-full"></div>
							<span>オフライン</span>
						</div>
					</DropdownMenuRadioItem>
				</DropdownMenuRadioGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	),
};