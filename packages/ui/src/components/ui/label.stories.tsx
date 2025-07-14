import type { Meta, StoryObj } from "@storybook/react";
import { Checkbox } from "./checkbox";
import { Input } from "./input";
import { Label } from "./label";
import { RadioGroup, RadioGroupItem } from "./radio-group";
import { Switch } from "./switch";
import { Textarea } from "./textarea";

const meta = {
	title: "UI/Label",
	component: Label,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
	argTypes: {
		children: {
			control: "text",
			description: "ラベルのテキスト",
		},
		className: {
			control: "text",
			description: "追加のCSSクラス",
		},
		htmlFor: {
			control: "text",
			description: "関連する入力要素のID",
		},
	},
} satisfies Meta<typeof Label>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		children: "ラベルテキスト",
	},
};

export const WithInput: Story = {
	render: () => (
		<div className="space-y-2">
			<Label htmlFor="username">ユーザー名</Label>
			<Input id="username" placeholder="ユーザー名を入力してください" />
		</div>
	),
};

export const WithTextarea: Story = {
	render: () => (
		<div className="space-y-2">
			<Label htmlFor="message">メッセージ</Label>
			<Textarea id="message" placeholder="メッセージを入力してください" />
		</div>
	),
};

export const WithCheckbox: Story = {
	render: () => (
		<div className="flex items-center space-x-2">
			<Checkbox id="terms" />
			<Label
				htmlFor="terms"
				className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
			>
				利用規約に同意する
			</Label>
		</div>
	),
};

export const WithSwitch: Story = {
	render: () => (
		<div className="flex items-center space-x-2">
			<Switch id="notifications" />
			<Label htmlFor="notifications">通知を受け取る</Label>
		</div>
	),
};

export const WithRadioGroup: Story = {
	render: () => (
		<div className="space-y-3">
			<Label className="text-base font-semibold">お支払い方法</Label>
			<RadioGroup defaultValue="card" className="space-y-2">
				<div className="flex items-center space-x-2">
					<RadioGroupItem value="card" id="card" />
					<Label htmlFor="card">クレジットカード</Label>
				</div>
				<div className="flex items-center space-x-2">
					<RadioGroupItem value="paypal" id="paypal" />
					<Label htmlFor="paypal">PayPal</Label>
				</div>
				<div className="flex items-center space-x-2">
					<RadioGroupItem value="bank" id="bank" />
					<Label htmlFor="bank">銀行振込</Label>
				</div>
			</RadioGroup>
		</div>
	),
};

export const Required: Story = {
	render: () => (
		<div className="space-y-2">
			<Label htmlFor="email" className="text-sm font-medium">
				メールアドレス
				<span className="text-red-500 ml-1">*</span>
			</Label>
			<Input id="email" type="email" placeholder="example@domain.com" required />
		</div>
	),
};

export const Disabled: Story = {
	render: () => (
		<div className="space-y-4">
			<div className="space-y-2">
				<Label htmlFor="disabled-input" className="opacity-50">
					無効な入力フィールド
				</Label>
				<Input id="disabled-input" placeholder="入力できません" disabled />
			</div>
			<div className="flex items-center space-x-2 opacity-50">
				<Checkbox id="disabled-checkbox" disabled />
				<Label htmlFor="disabled-checkbox">無効なチェックボックス</Label>
			</div>
		</div>
	),
};

export const FormExample: Story = {
	render: () => (
		<div className="max-w-md space-y-4 p-6 border rounded-lg">
			<h3 className="text-lg font-semibold">お問い合わせフォーム</h3>

			<div className="space-y-2">
				<Label htmlFor="contact-name">
					お名前
					<span className="text-red-500 ml-1">*</span>
				</Label>
				<Input id="contact-name" placeholder="山田太郎" required />
			</div>

			<div className="space-y-2">
				<Label htmlFor="contact-email">
					メールアドレス
					<span className="text-red-500 ml-1">*</span>
				</Label>
				<Input id="contact-email" type="email" placeholder="yamada@example.com" required />
			</div>

			<div className="space-y-2">
				<Label htmlFor="contact-subject">件名</Label>
				<Input id="contact-subject" placeholder="お問い合わせの件名" />
			</div>

			<div className="space-y-2">
				<Label htmlFor="contact-message">
					メッセージ
					<span className="text-red-500 ml-1">*</span>
				</Label>
				<Textarea id="contact-message" placeholder="お問い合わせ内容をご記入ください" required />
			</div>

			<div className="flex items-center space-x-2">
				<Checkbox id="contact-newsletter" />
				<Label htmlFor="contact-newsletter" className="text-sm">
					ニュースレターの配信を希望する
				</Label>
			</div>

			<div className="flex items-center space-x-2">
				<Checkbox id="contact-terms" />
				<Label htmlFor="contact-terms" className="text-sm">
					プライバシーポリシーに同意する
					<span className="text-red-500 ml-1">*</span>
				</Label>
			</div>
		</div>
	),
};

export const LabelSizes: Story = {
	render: () => (
		<div className="space-y-4">
			<div className="space-y-1">
				<Label className="text-xs font-medium">極小サイズ</Label>
				<Input placeholder="入力フィールド" />
			</div>
			<div className="space-y-1">
				<Label className="text-sm font-medium">小サイズ（デフォルト）</Label>
				<Input placeholder="入力フィールド" />
			</div>
			<div className="space-y-1">
				<Label className="text-base font-medium">中サイズ</Label>
				<Input placeholder="入力フィールド" />
			</div>
			<div className="space-y-1">
				<Label className="text-lg font-medium">大サイズ</Label>
				<Input placeholder="入力フィールド" />
			</div>
		</div>
	),
};

export const LabelStyles: Story = {
	render: () => (
		<div className="space-y-4">
			<div className="space-y-1">
				<Label className="text-sm font-normal">通常の太さ</Label>
				<Input placeholder="入力フィールド" />
			</div>
			<div className="space-y-1">
				<Label className="text-sm font-medium">中程度の太さ（デフォルト）</Label>
				<Input placeholder="入力フィールド" />
			</div>
			<div className="space-y-1">
				<Label className="text-sm font-semibold">セミボールド</Label>
				<Input placeholder="入力フィールド" />
			</div>
			<div className="space-y-1">
				<Label className="text-sm font-bold">ボールド</Label>
				<Input placeholder="入力フィールド" />
			</div>
		</div>
	),
};
