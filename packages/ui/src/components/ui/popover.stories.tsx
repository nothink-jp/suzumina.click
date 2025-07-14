import type { Meta, StoryObj } from "@storybook/react";
import { CalendarIcon, InfoIcon, SettingsIcon, UserIcon } from "lucide-react";
import { Button } from "./button";
import { Input } from "./input";
import { Label } from "./label";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Separator } from "./separator";

const meta = {
	title: "UI/Popover",
	component: Popover,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
} satisfies Meta<typeof Popover>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {
	render: () => (
		<Popover>
			<PopoverTrigger asChild>
				<Button variant="outline">ポップオーバーを開く</Button>
			</PopoverTrigger>
			<PopoverContent>
				<div className="space-y-2">
					<h4 className="font-medium leading-none">ポップオーバー</h4>
					<p className="text-sm text-muted-foreground">
						これはポップオーバーの内容です。ボタンをクリックして開くことができます。
					</p>
				</div>
			</PopoverContent>
		</Popover>
	),
};

export const WithForm: Story = {
	render: () => (
		<Popover>
			<PopoverTrigger asChild>
				<Button variant="outline">
					<UserIcon className="mr-2 h-4 w-4" />
					プロフィール編集
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-80">
				<div className="space-y-4">
					<div className="space-y-2">
						<h4 className="font-medium leading-none">プロフィールを編集</h4>
						<p className="text-sm text-muted-foreground">プロフィール情報を更新してください。</p>
					</div>
					<Separator />
					<div className="space-y-3">
						<div className="space-y-2">
							<Label htmlFor="name" className="text-sm font-medium">
								名前
							</Label>
							<Input id="name" placeholder="山田太郎" />
						</div>
						<div className="space-y-2">
							<Label htmlFor="email" className="text-sm font-medium">
								メールアドレス
							</Label>
							<Input id="email" type="email" placeholder="yamada@example.com" />
						</div>
						<div className="flex gap-2 pt-2">
							<Button size="sm">保存</Button>
							<Button variant="outline" size="sm">
								キャンセル
							</Button>
						</div>
					</div>
				</div>
			</PopoverContent>
		</Popover>
	),
};

export const Positioning: Story = {
	render: () => (
		<div className="grid grid-cols-3 gap-4 p-8">
			<Popover>
				<PopoverTrigger asChild>
					<Button variant="outline">上部</Button>
				</PopoverTrigger>
				<PopoverContent side="top" className="w-56">
					<p className="text-sm">ボタンの上部に表示されるポップオーバーです。</p>
				</PopoverContent>
			</Popover>

			<Popover>
				<PopoverTrigger asChild>
					<Button variant="outline">右側</Button>
				</PopoverTrigger>
				<PopoverContent side="right" className="w-56">
					<p className="text-sm">ボタンの右側に表示されるポップオーバーです。</p>
				</PopoverContent>
			</Popover>

			<Popover>
				<PopoverTrigger asChild>
					<Button variant="outline">下部（デフォルト）</Button>
				</PopoverTrigger>
				<PopoverContent side="bottom" className="w-56">
					<p className="text-sm">ボタンの下部に表示されるポップオーバーです。</p>
				</PopoverContent>
			</Popover>

			<Popover>
				<PopoverTrigger asChild>
					<Button variant="outline">左側</Button>
				</PopoverTrigger>
				<PopoverContent side="left" className="w-56">
					<p className="text-sm">ボタンの左側に表示されるポップオーバーです。</p>
				</PopoverContent>
			</Popover>

			<Popover>
				<PopoverTrigger asChild>
					<Button variant="outline">開始位置揃え</Button>
				</PopoverTrigger>
				<PopoverContent align="start" className="w-56">
					<p className="text-sm">開始位置に揃えて表示されます。</p>
				</PopoverContent>
			</Popover>

			<Popover>
				<PopoverTrigger asChild>
					<Button variant="outline">終了位置揃え</Button>
				</PopoverTrigger>
				<PopoverContent align="end" className="w-56">
					<p className="text-sm">終了位置に揃えて表示されます。</p>
				</PopoverContent>
			</Popover>
		</div>
	),
};

export const InfoPopover: Story = {
	render: () => (
		<div className="flex items-center gap-2">
			<span>ユーザー名</span>
			<Popover>
				<PopoverTrigger asChild>
					<Button variant="ghost" size="sm" className="h-4 w-4 p-0">
						<InfoIcon className="h-3 w-3" />
					</Button>
				</PopoverTrigger>
				<PopoverContent className="w-64">
					<div className="space-y-2">
						<h4 className="font-medium text-sm">ユーザー名について</h4>
						<p className="text-xs text-muted-foreground">
							ユーザー名は3文字以上20文字以下で設定してください。英数字とアンダースコアが使用できます。
						</p>
					</div>
				</PopoverContent>
			</Popover>
		</div>
	),
};

export const MenuPopover: Story = {
	render: () => (
		<Popover>
			<PopoverTrigger asChild>
				<Button variant="outline">
					<SettingsIcon className="mr-2 h-4 w-4" />
					設定メニュー
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-56">
				<div className="space-y-1">
					<Button variant="ghost" className="w-full justify-start">
						<UserIcon className="mr-2 h-4 w-4" />
						プロフィール
					</Button>
					<Button variant="ghost" className="w-full justify-start">
						<SettingsIcon className="mr-2 h-4 w-4" />
						設定
					</Button>
					<Button variant="ghost" className="w-full justify-start">
						<CalendarIcon className="mr-2 h-4 w-4" />
						カレンダー
					</Button>
					<Separator className="my-2" />
					<Button variant="ghost" className="w-full justify-start text-red-600">
						ログアウト
					</Button>
				</div>
			</PopoverContent>
		</Popover>
	),
};

export const CustomWidth: Story = {
	render: () => (
		<div className="flex gap-4">
			<Popover>
				<PopoverTrigger asChild>
					<Button variant="outline">小さい</Button>
				</PopoverTrigger>
				<PopoverContent className="w-48">
					<p className="text-sm">これは小さいポップオーバーです。</p>
				</PopoverContent>
			</Popover>

			<Popover>
				<PopoverTrigger asChild>
					<Button variant="outline">デフォルト</Button>
				</PopoverTrigger>
				<PopoverContent>
					<p className="text-sm">これはデフォルトサイズ（w-72）のポップオーバーです。</p>
				</PopoverContent>
			</Popover>

			<Popover>
				<PopoverTrigger asChild>
					<Button variant="outline">大きい</Button>
				</PopoverTrigger>
				<PopoverContent className="w-96">
					<p className="text-sm">
						これは大きいポップオーバーです。より多くのコンテンツを含むことができます。
					</p>
				</PopoverContent>
			</Popover>
		</div>
	),
};

export const WithoutPadding: Story = {
	render: () => (
		<Popover>
			<PopoverTrigger asChild>
				<Button variant="outline">パディングなし</Button>
			</PopoverTrigger>
			<PopoverContent className="w-56 p-0">
				<div className="space-y-0">
					<div className="p-3 border-b">
						<h4 className="font-medium text-sm">タイトル</h4>
					</div>
					<div className="p-3">
						<p className="text-sm text-muted-foreground">
							パディングを調整したポップオーバーです。
						</p>
					</div>
					<div className="p-3 border-t bg-muted/50">
						<Button size="sm" className="w-full">
							アクション
						</Button>
					</div>
				</div>
			</PopoverContent>
		</Popover>
	),
};

export const ControlledExample: Story = {
	render: () => {
		const [open, setOpen] = React.useState(false);

		return (
			<div className="space-y-4">
				<div className="flex gap-2">
					<Button onClick={() => setOpen(true)} variant="outline">
						開く
					</Button>
					<Button onClick={() => setOpen(false)} variant="outline">
						閉じる
					</Button>
					<span className="text-sm text-muted-foreground">
						状態: {open ? "開いている" : "閉じている"}
					</span>
				</div>
				<Popover open={open} onOpenChange={setOpen}>
					<PopoverTrigger asChild>
						<Button variant="outline">制御されたポップオーバー</Button>
					</PopoverTrigger>
					<PopoverContent>
						<div className="space-y-2">
							<h4 className="font-medium">制御されたポップオーバー</h4>
							<p className="text-sm text-muted-foreground">
								このポップオーバーは外部から制御されています。
							</p>
							<Button size="sm" onClick={() => setOpen(false)}>
								閉じる
							</Button>
						</div>
					</PopoverContent>
				</Popover>
			</div>
		);
	},
};
