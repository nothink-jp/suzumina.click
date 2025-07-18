import type { Meta, StoryObj } from "@storybook/react";
import { TimeDisplay } from "./time-display";

const meta: Meta<typeof TimeDisplay> = {
	title: "Custom/TimeDisplay",
	component: TimeDisplay,
	parameters: {
		layout: "centered",
		docs: {
			description: {
				component:
					"時間を指定されたフォーマットで表示するコンポーネント。音声ボタン、動画プレイヤーなどで使用。",
			},
		},
	},
	tags: ["autodocs"],
	argTypes: {
		time: {
			control: { type: "number", min: 0, max: 7200, step: 0.1 },
			description: "表示する時間（秒）",
		},
		format: {
			control: { type: "select" },
			options: ["mm:ss.s", "h:mm:ss.s", "auto"],
			description: "時間フォーマット",
		},
		className: {
			control: "text",
			description: "カスタムクラス名",
		},
		showLabel: {
			control: "boolean",
			description: "ラベルを表示するかどうか",
		},
		label: {
			control: "text",
			description: "カスタムラベル",
		},
		labelClassName: {
			control: "text",
			description: "ラベルのクラス名",
		},
		invalidText: {
			control: "text",
			description: "無効な時間の場合の表示テキスト",
		},
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

// 基本的な使用例
export const Default: Story = {
	args: {
		time: 123.4,
	},
};

// 短時間（1分未満）
export const ShortTime: Story = {
	args: {
		time: 45.7,
		format: "mm:ss.s",
	},
	parameters: {
		docs: {
			description: {
				story: "1分未満の短い時間の表示例",
			},
		},
	},
};

// 長時間（1時間以上）
export const LongTime: Story = {
	args: {
		time: 3723.8, // 1時間2分3.8秒
		format: "h:mm:ss.s",
	},
	parameters: {
		docs: {
			description: {
				story: "1時間以上の長い時間の表示例",
			},
		},
	},
};

// 自動フォーマット（短時間）
export const AutoFormatShort: Story = {
	args: {
		time: 185.3, // 3分5.3秒
		format: "auto",
	},
	parameters: {
		docs: {
			description: {
				story: "autoフォーマットでの短時間表示（1時間未満はmm:ss.s）",
			},
		},
	},
};

// 自動フォーマット（長時間）
export const AutoFormatLong: Story = {
	args: {
		time: 4567.2, // 1時間16分7.2秒
		format: "auto",
	},
	parameters: {
		docs: {
			description: {
				story: "autoフォーマットでの長時間表示（1時間以上はh:mm:ss.s）",
			},
		},
	},
};

// ラベル付き
export const WithLabel: Story = {
	args: {
		time: 95.6,
		showLabel: true,
		label: "再生時間",
	},
	parameters: {
		docs: {
			description: {
				story: "ラベル付きの時間表示",
			},
		},
	},
};

// カスタムラベル
export const CustomLabel: Story = {
	args: {
		time: 240.1,
		showLabel: true,
		label: "動画長",
		labelClassName: "text-primary font-medium",
	},
	parameters: {
		docs: {
			description: {
				story: "カスタムラベルとスタイリング",
			},
		},
	},
};

// スタイリングされた表示
export const Styled: Story = {
	args: {
		time: 156.8,
		className: "text-lg text-primary bg-primary/10 px-2 py-1 rounded",
		showLabel: true,
		label: "切り抜き時間",
	},
	parameters: {
		docs: {
			description: {
				story: "カスタムスタイリングを適用した表示",
			},
		},
	},
};

// 無効な時間値
export const InvalidTime: Story = {
	args: {
		time: NaN,
		showLabel: true,
		label: "エラー時間",
		invalidText: "計算エラー",
	},
	parameters: {
		docs: {
			description: {
				story: "無効な時間値の場合のエラー表示",
			},
		},
	},
};

// 負の値
export const NegativeTime: Story = {
	args: {
		time: -10.5,
		showLabel: true,
		label: "時間",
	},
	parameters: {
		docs: {
			description: {
				story: "負の値の場合のエラー表示",
			},
		},
	},
};

// 音声ボタンでの使用例
export const AudioButtonExample: Story = {
	args: {
		time: 67.3,
		format: "mm:ss.s",
		className: "text-sm font-mono text-muted-foreground",
	},
	parameters: {
		docs: {
			description: {
				story: "音声ボタンコンポーネントでの典型的な使用例",
			},
		},
	},
};

// 複数のフォーマット比較
export const FormatComparison: Story = {
	render: () => (
		<div className="space-y-4">
			<div className="text-sm font-medium text-muted-foreground mb-2">
				同じ時間値 (3723.8秒) の異なるフォーマット：
			</div>
			<div className="space-y-2">
				<div className="flex items-center gap-4">
					<span className="w-16 text-sm text-muted-foreground">mm:ss.s:</span>
					<TimeDisplay time={3723.8} format="mm:ss.s" />
				</div>
				<div className="flex items-center gap-4">
					<span className="w-16 text-sm text-muted-foreground">h:mm:ss.s:</span>
					<TimeDisplay time={3723.8} format="h:mm:ss.s" />
				</div>
				<div className="flex items-center gap-4">
					<span className="w-16 text-sm text-muted-foreground">auto:</span>
					<TimeDisplay time={3723.8} format="auto" />
				</div>
			</div>
		</div>
	),
	parameters: {
		docs: {
			description: {
				story: "同じ時間値での異なるフォーマットの比較",
			},
		},
	},
};
