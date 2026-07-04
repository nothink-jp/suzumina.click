import type { Meta, StoryObj } from "@storybook/react-vite";
import { Check, Cookie, X } from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { DockedPanel } from "./docked-panel";

const meta = {
	title: "Custom/Layout/DockedPanel",
	component: DockedPanel,
	parameters: {
		layout: "padded",
	},
	tags: ["autodocs"],
	// DockedPanel は position:fixed でビューポート角にドッキングする。story では
	// transform 付きコンテナを containing block にして、パネルをデモ枠内に収める
	// （コンポーネント自体のクラスは無加工＝実挙動のまま基準点だけを枠に変える）。
	decorators: [
		(Story) => (
			<div className="transform-gpu relative h-[380px] w-full overflow-hidden rounded-lg border bg-muted/30">
				<p className="p-4 text-sm text-muted-foreground">
					背後のページコンテンツ（パネルはブロッキングしない）
				</p>
				<Story />
			</div>
		),
	],
	argTypes: {
		position: {
			control: "radio",
			options: ["bottom-right", "bottom-left"],
			description: "広い画面での配置角",
		},
		variant: {
			control: "radio",
			options: ["card", "pill"],
			description: "card（角丸xl。年齢確認カード等）か pill（角丸full。Cookieバー等）",
		},
		role: {
			control: "radio",
			options: ["region", "status"],
			description: "ランドマークロール（通知的な内容は status）",
		},
		mobileSheet: {
			control: "boolean",
			description: "狭い画面で全幅ボトムシート化するか（常時コンパクトな要素は false）",
		},
	},
} satisfies Meta<typeof DockedPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 年齢確認カード（apps/web の表示モード確認）を模した card variant。 */
export const Default: Story = {
	args: {
		position: "bottom-right",
		variant: "card",
	},
	render: (args) => (
		<DockedPanel
			{...args}
			aria-label="表示モードの確認"
			className="flex w-full flex-col gap-3 p-5 sm:max-w-[360px]"
		>
			<div className="flex items-center gap-2">
				<Badge variant="destructive">R18</Badge>
				<h3 className="text-sm font-bold text-foreground">表示モードの確認</h3>
			</div>
			<p className="text-xs leading-relaxed text-muted-foreground">
				このサイトは18歳未満の方に適さないコンテンツを含みます。現在は
				<strong className="text-foreground">全年齢作品のみ</strong>表示しています。
			</p>
			<div className="flex flex-col gap-2">
				<Button className="w-full">18歳以上 — すべての作品を表示</Button>
				<Button variant="outline" className="w-full">
					全年齢のみで続ける
				</Button>
			</div>
			<p className="text-[11px] leading-relaxed text-muted-foreground">
				選択は30日間このブラウザに記憶されます。
			</p>
		</DockedPanel>
	),
};

/** Cookie 同意バー（apps/web）を模した pill variant・bottom-left。 */
export const Pill: Story = {
	args: {
		position: "bottom-left",
		variant: "pill",
	},
	render: (args) => (
		<DockedPanel
			{...args}
			aria-label="クッキーの使用"
			className="flex flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap sm:py-2 sm:pr-2 sm:pl-4"
		>
			<Cookie className="h-4 w-4 flex-shrink-0 text-primary" />
			<span className="min-w-0 flex-1 text-xs text-foreground sm:flex-none sm:whitespace-nowrap">
				サイト改善のためクッキーを使用します
			</span>
			<button type="button" className="whitespace-nowrap text-xs text-primary underline">
				詳細設定
			</button>
			<div className="flex w-full gap-2 sm:w-auto">
				<Button variant="outline" size="sm" className="flex-1 sm:flex-none">
					拒否
				</Button>
				<Button size="sm" className="flex-1 sm:flex-none">
					許可
				</Button>
			</div>
		</DockedPanel>
	),
};

/** 選択確定後の確認トースト（role="status"）を模したコンパクトな card。 */
export const StatusCard: Story = {
	args: {
		position: "bottom-right",
		variant: "card",
		role: "status",
	},
	render: (args) => (
		<DockedPanel
			{...args}
			aria-label="表示モードの確認"
			className="flex max-w-full items-center gap-3 p-3.5 sm:max-w-[400px]"
		>
			<div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-success/10 text-success">
				<Check className="h-4 w-4" />
			</div>
			<span className="text-sm text-foreground">全年齢対象の作品のみ表示します</span>
			<button type="button" className="whitespace-nowrap text-xs text-primary underline">
				変更
			</button>
			<button
				type="button"
				aria-label="閉じる"
				className="text-muted-foreground hover:text-foreground"
			>
				<X className="h-3.5 w-3.5" />
			</button>
		</DockedPanel>
	),
};

/** 表示設定の再オープンピル: mobileSheet=false で狭い画面でもコンパクトに留まる。 */
export const CompactPill: Story = {
	args: {
		position: "bottom-right",
		variant: "pill",
		mobileSheet: false,
	},
	render: (args) => (
		<DockedPanel {...args} aria-label="表示設定を開く" className="px-1 py-1">
			<button
				type="button"
				className="flex items-center gap-2 rounded-full px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
			>
				<Badge variant="outline" className="px-1.5 text-[10px]">
					全年齢
				</Badge>
				表示設定
			</button>
		</DockedPanel>
	),
};
