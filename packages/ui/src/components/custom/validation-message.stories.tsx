import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { ValidationMessage, ValidationMessages } from "./validation-message";

const meta: Meta<typeof ValidationMessage> = {
	title: "Custom/Form/ValidationMessage",
	component: ValidationMessage,
	parameters: {
		layout: "centered",
		docs: {
			description: {
				component:
					"フォームバリデーションやエラー表示に使用するメッセージコンポーネント。アイコン付きで視覚的に分かりやすく表示。",
			},
		},
	},
	tags: ["autodocs"],
	argTypes: {
		variant: {
			control: { type: "select" },
			options: ["error", "warning", "info"],
			description: "メッセージの種類",
		},
		message: {
			control: "text",
			description: "表示するメッセージ",
		},
		isVisible: {
			control: "boolean",
			description: "メッセージを表示するかどうか",
		},
		showIcon: {
			control: "boolean",
			description: "アイコンを表示するかどうか",
		},
		className: {
			control: "text",
			description: "カスタムクラス名",
		},
		animated: {
			control: "boolean",
			description: "アニメーション効果を有効にするかどうか",
		},
		compact: {
			control: "boolean",
			description: "コンパクトサイズで表示するかどうか",
		},
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

// 基本的な使用例
export const Default: Story = {
	args: {
		variant: "error",
		message: "入力値が無効です",
		isVisible: true,
	},
};

// エラーメッセージ
export const Error: Story = {
	args: {
		variant: "error",
		message: "この項目は必須です",
		isVisible: true,
	},
	parameters: {
		docs: {
			description: {
				story: "エラーメッセージの表示例",
			},
		},
	},
};

// 警告メッセージ
export const Warning: Story = {
	args: {
		variant: "warning",
		message: "推奨範囲外の値です",
		isVisible: true,
	},
	parameters: {
		docs: {
			description: {
				story: "警告メッセージの表示例",
			},
		},
	},
};

// 情報メッセージ
export const Info: Story = {
	args: {
		variant: "info",
		message: "この設定は後で変更できます",
		isVisible: true,
	},
	parameters: {
		docs: {
			description: {
				story: "情報メッセージの表示例",
			},
		},
	},
};

// アイコンなし
export const WithoutIcon: Story = {
	args: {
		variant: "error",
		message: "アイコンなしのメッセージ",
		isVisible: true,
		showIcon: false,
	},
	parameters: {
		docs: {
			description: {
				story: "アイコンを非表示にした場合",
			},
		},
	},
};

// コンパクトサイズ
export const Compact: Story = {
	args: {
		variant: "error",
		message: "コンパクトサイズのメッセージ",
		isVisible: true,
		compact: true,
	},
	parameters: {
		docs: {
			description: {
				story: "コンパクトサイズでの表示",
			},
		},
	},
};

// アニメーションなし
export const WithoutAnimation: Story = {
	args: {
		variant: "warning",
		message: "アニメーションなしのメッセージ",
		isVisible: true,
		animated: false,
	},
	parameters: {
		docs: {
			description: {
				story: "アニメーション効果を無効にした場合",
			},
		},
	},
};

// 複数バリアントの比較
export const VariantComparison: Story = {
	render: () => (
		<div className="space-y-4 w-80">
			<div className="text-sm font-medium text-muted-foreground mb-2">各バリアントの比較：</div>
			<div className="space-y-3">
				<ValidationMessage variant="error" message="エラーメッセージの例" isVisible={true} />
				<ValidationMessage variant="warning" message="警告メッセージの例" isVisible={true} />
				<ValidationMessage variant="info" message="情報メッセージの例" isVisible={true} />
			</div>
		</div>
	),
	parameters: {
		docs: {
			description: {
				story: "すべてのバリアントの比較表示",
			},
		},
	},
};

// インタラクティブな例
export const Interactive: Story = {
	render: () => {
		const [showMessage, setShowMessage] = useState(false);
		const [variant, setVariant] = useState<"error" | "warning" | "info">("error");

		return (
			<div className="space-y-4 w-80">
				<div className="space-y-2">
					<label className="text-sm font-medium">バリアント選択:</label>
					<select
						value={variant}
						onChange={(e) => setVariant(e.target.value as "error" | "warning" | "info")}
						className="w-full p-2 border rounded"
					>
						<option value="error">Error</option>
						<option value="warning">Warning</option>
						<option value="info">Info</option>
					</select>
				</div>
				<Button onClick={() => setShowMessage(!showMessage)}>
					{showMessage ? "メッセージを隠す" : "メッセージを表示"}
				</Button>
				<ValidationMessage
					variant={variant}
					message={`これは${variant}メッセージです`}
					isVisible={showMessage}
				/>
			</div>
		);
	},
	parameters: {
		docs: {
			description: {
				story: "インタラクティブにメッセージの表示/非表示を切り替えられる例",
			},
		},
	},
};

// フォームでの使用例
export const FormExample: Story = {
	render: () => {
		const [email, setEmail] = useState("");
		const [password, setPassword] = useState("");

		const emailError = email.length > 0 && !email.includes("@");
		const passwordError = password.length > 0 && password.length < 8;

		return (
			<div className="space-y-4 w-80">
				<div className="text-sm font-medium text-muted-foreground mb-4">フォームでの使用例：</div>
				<div className="space-y-2">
					<label className="text-sm font-medium">メールアドレス</label>
					<Input
						type="email"
						value={email}
						onChange={(e) => setEmail(e.target.value)}
						placeholder="example@email.com"
						className={emailError ? "border-destructive" : ""}
					/>
					<ValidationMessage
						variant="error"
						message="有効なメールアドレスを入力してください"
						isVisible={emailError}
					/>
				</div>
				<div className="space-y-2">
					<label className="text-sm font-medium">パスワード</label>
					<Input
						type="password"
						value={password}
						onChange={(e) => setPassword(e.target.value)}
						placeholder="パスワードを入力"
						className={passwordError ? "border-destructive" : ""}
					/>
					<ValidationMessage
						variant="error"
						message="パスワードは8文字以上で入力してください"
						isVisible={passwordError}
					/>
				</div>
			</div>
		);
	},
	parameters: {
		docs: {
			description: {
				story: "フォーム入力での実際の使用例",
			},
		},
	},
};

// 事前定義メッセージの例
export const PredefinedMessages: Story = {
	render: () => (
		<div className="space-y-4 w-80">
			<div className="text-sm font-medium text-muted-foreground mb-2">
				事前定義されたメッセージコンポーネント：
			</div>
			<div className="space-y-3">
				<ValidationMessages.TimeRange isVisible={true} />
				<ValidationMessages.MaxDuration maxSeconds={60} isVisible={true} />
				<ValidationMessages.MinDuration minSeconds={1} isVisible={true} />
				<ValidationMessages.Required fieldName="タイトル" isVisible={true} />
				<ValidationMessages.MaxLength maxLength={100} isVisible={true} />
				<ValidationMessages.InvalidFormat format="MM:SS.S形式" isVisible={true} />
			</div>
		</div>
	),
	parameters: {
		docs: {
			description: {
				story: "事前定義されたメッセージコンポーネントの一覧",
			},
		},
	},
};

// 音声ボタンでの使用例
export const AudioButtonExample: Story = {
	render: () => {
		const [startTime, setStartTime] = useState("0:10.0");
		const [endTime, setEndTime] = useState("0:05.0");

		const parseTime = (timeStr: string): number => {
			const match = timeStr.match(/^(\d+):(\d{2})\.(\d)$/);
			if (!match) return 0;
			const minutes = parseInt(match[1], 10);
			const seconds = parseInt(match[2], 10);
			const decimal = parseInt(match[3], 10);
			return minutes * 60 + seconds + decimal / 10;
		};

		const start = parseTime(startTime);
		const end = parseTime(endTime);
		const duration = end - start;

		const hasTimeRangeError = start >= end;
		const hasDurationError = !hasTimeRangeError && duration > 60;
		const hasMinDurationError = !hasTimeRangeError && duration < 1;

		return (
			<div className="space-y-4 w-80">
				<div className="text-sm font-medium text-muted-foreground mb-4">
					音声ボタン作成での使用例：
				</div>
				<div className="space-y-2">
					<label className="text-sm font-medium">開始時間</label>
					<Input
						value={startTime}
						onChange={(e) => setStartTime(e.target.value)}
						placeholder="0:00.0"
					/>
				</div>
				<div className="space-y-2">
					<label className="text-sm font-medium">終了時間</label>
					<Input
						value={endTime}
						onChange={(e) => setEndTime(e.target.value)}
						placeholder="0:00.0"
					/>
				</div>
				<div className="space-y-2">
					<ValidationMessages.TimeRange isVisible={hasTimeRangeError} />
					<ValidationMessages.MaxDuration maxSeconds={60} isVisible={hasDurationError} />
					<ValidationMessages.MinDuration minSeconds={1} isVisible={hasMinDurationError} />
				</div>
			</div>
		);
	},
	parameters: {
		docs: {
			description: {
				story: "音声ボタン作成フォームでの実際の使用例",
			},
		},
	},
};
