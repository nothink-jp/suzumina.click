import type { Meta, StoryObj } from "@storybook/react";
import { Label } from "./label";
import { Textarea } from "./textarea";

const meta = {
	title: "UI/Textarea",
	component: Textarea,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
	argTypes: {
		placeholder: {
			control: "text",
			description: "プレースホルダーテキスト",
		},
		disabled: {
			control: "boolean",
			description: "無効状態",
		},
		required: {
			control: "boolean",
			description: "必須フィールド",
		},
		rows: {
			control: "number",
			description: "行数",
		},
		className: {
			control: "text",
			description: "追加のCSSクラス",
		},
	},
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		placeholder: "テキストを入力してください...",
	},
};

export const WithLabel: Story = {
	render: () => (
		<div className="space-y-2 w-80">
			<Label htmlFor="message">メッセージ</Label>
			<Textarea id="message" placeholder="メッセージを入力してください..." />
		</div>
	),
};

export const WithValue: Story = {
	args: {
		defaultValue:
			"これは初期値として設定されたテキストです。\n複数行にわたって記述することができます。",
		placeholder: "テキストを入力してください...",
	},
};

export const Required: Story = {
	render: () => (
		<div className="space-y-2 w-80">
			<Label htmlFor="required-message">
				メッセージ
				<span className="text-red-500 ml-1">*</span>
			</Label>
			<Textarea id="required-message" placeholder="必須項目です" required />
		</div>
	),
};

export const Disabled: Story = {
	args: {
		placeholder: "入力できません",
		disabled: true,
	},
};

export const DisabledWithValue: Story = {
	args: {
		defaultValue: "これは無効化されたテキストエリアです。編集することはできません。",
		disabled: true,
	},
};

export const WithRowsSpecified: Story = {
	render: () => (
		<div className="space-y-4 w-80">
			<div className="space-y-2">
				<Label>3行（デフォルト）</Label>
				<Textarea placeholder="3行のテキストエリア" rows={3} />
			</div>
			<div className="space-y-2">
				<Label>6行</Label>
				<Textarea placeholder="6行のテキストエリア" rows={6} />
			</div>
			<div className="space-y-2">
				<Label>10行</Label>
				<Textarea placeholder="10行のテキストエリア" rows={10} />
			</div>
		</div>
	),
};

export const ContactForm: Story = {
	render: () => (
		<div className="max-w-md space-y-4 p-6 border rounded-lg">
			<h3 className="text-lg font-semibold">お問い合わせフォーム</h3>

			<div className="space-y-2">
				<Label htmlFor="subject">件名</Label>
				<Textarea id="subject" placeholder="お問い合わせの件名を入力してください" rows={2} />
			</div>

			<div className="space-y-2">
				<Label htmlFor="inquiry">
					お問い合わせ内容
					<span className="text-red-500 ml-1">*</span>
				</Label>
				<Textarea id="inquiry" placeholder="詳細な内容をご記入ください..." rows={6} required />
			</div>

			<div className="space-y-2">
				<Label htmlFor="additional">追加情報</Label>
				<Textarea
					id="additional"
					placeholder="必要に応じて追加情報をご記入ください（任意）"
					rows={3}
				/>
			</div>
		</div>
	),
};

export const FeedbackForm: Story = {
	render: () => (
		<div className="max-w-lg space-y-4 p-6 border rounded-lg">
			<h3 className="text-lg font-semibold">フィードバック</h3>
			<p className="text-sm text-muted-foreground">
				サービスに対するご意見・ご感想をお聞かせください。
			</p>

			<div className="space-y-2">
				<Label htmlFor="good-points">良かった点</Label>
				<Textarea id="good-points" placeholder="サービスの良かった点を教えてください" rows={4} />
			</div>

			<div className="space-y-2">
				<Label htmlFor="improvement-points">改善点・要望</Label>
				<Textarea
					id="improvement-points"
					placeholder="改善してほしい点や新機能のご要望があればお聞かせください"
					rows={4}
				/>
			</div>

			<div className="space-y-2">
				<Label htmlFor="overall-feedback">総合的な感想</Label>
				<Textarea
					id="overall-feedback"
					placeholder="サービス全体に対する総合的なご感想をお聞かせください"
					rows={5}
				/>
			</div>
		</div>
	),
};

export const ErrorState: Story = {
	render: () => (
		<div className="space-y-2 w-80">
			<Label htmlFor="error-textarea">コメント</Label>
			<Textarea
				id="error-textarea"
				placeholder="コメントを入力してください"
				aria-invalid="true"
				className="border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/20"
			/>
			<p className="text-sm text-red-500">このフィールドは必須です。</p>
		</div>
	),
};

export const CharacterCount: Story = {
	render: () => {
		const [value, setValue] = React.useState("");
		const maxLength = 200;

		return (
			<div className="space-y-2 w-80">
				<Label htmlFor="char-count-textarea">メッセージ（{maxLength}文字以内）</Label>
				<Textarea
					id="char-count-textarea"
					placeholder="メッセージを入力してください..."
					value={value}
					onChange={(e) => setValue(e.target.value)}
					maxLength={maxLength}
					rows={4}
				/>
				<div className="flex justify-between text-sm">
					<span className="text-muted-foreground">
						{value.length} / {maxLength} 文字
					</span>
					<span
						className={value.length > maxLength * 0.9 ? "text-red-500" : "text-muted-foreground"}
					>
						残り {maxLength - value.length} 文字
					</span>
				</div>
			</div>
		);
	},
};

export const AutoResize: Story = {
	render: () => (
		<div className="space-y-2 w-80">
			<Label htmlFor="auto-resize">自動リサイズ（CSS field-sizing: content）</Label>
			<Textarea
				id="auto-resize"
				placeholder="入力に応じて高さが自動調整されます..."
				className="min-h-16 field-sizing-content"
			/>
			<p className="text-xs text-muted-foreground">
				テキストを入力すると高さが自動的に調整されます
			</p>
		</div>
	),
};
