import type { Meta, StoryObj } from "@storybook/react";
import { Bell, Eye, Shield, Volume2 } from "lucide-react";
import { useState } from "react";
import { Switch } from "./switch";

const meta: Meta<typeof Switch> = {
	title: "UI/Switch",
	component: Switch,
	parameters: {
		layout: "centered",
		docs: {
			description: {
				component: "A customizable toggle switch component built with Radix UI Switch primitive.",
			},
		},
	},
	tags: ["autodocs"],
	argTypes: {
		checked: {
			control: "boolean",
			description: "Whether the switch is checked",
		},
		disabled: {
			control: "boolean",
			description: "Whether the switch is disabled",
		},
		onCheckedChange: {
			action: "checked changed",
			description: "Callback fired when the checked state changes",
		},
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

// Basic switch examples
export const Default: Story = {
	args: {
		checked: false,
		disabled: false,
	},
};

export const Checked: Story = {
	args: {
		checked: true,
		disabled: false,
	},
};

export const Disabled: Story = {
	args: {
		checked: false,
		disabled: true,
	},
};

export const DisabledChecked: Story = {
	args: {
		checked: true,
		disabled: true,
	},
};

// Interactive example
export const Interactive: Story = {
	render: () => {
		const [checked, setChecked] = useState(false);

		return (
			<div className="flex flex-col gap-4">
				<div className="flex items-center gap-3">
					<Switch checked={checked} onCheckedChange={setChecked} id="interactive-switch" />
					<label htmlFor="interactive-switch" className="text-sm font-medium">
						状態: {checked ? "ON" : "OFF"}
					</label>
				</div>
				<p className="text-xs text-muted-foreground">クリックして切り替えてください</p>
			</div>
		);
	},
};

// Real-world usage examples
export const WithLabels: Story = {
	render: () => {
		const [notifications, setNotifications] = useState(true);
		const [sound, setSound] = useState(false);
		const [visibility, setVisibility] = useState(true);

		return (
			<div className="space-y-4 p-4 border rounded-lg bg-card">
				<h3 className="text-lg font-semibold">設定</h3>

				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<Bell className="h-4 w-4 text-muted-foreground" />
						<span className="text-sm font-medium">通知を受け取る</span>
					</div>
					<Switch checked={notifications} onCheckedChange={setNotifications} id="notifications" />
				</div>

				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<Volume2 className="h-4 w-4 text-muted-foreground" />
						<span className="text-sm font-medium">サウンドを再生</span>
					</div>
					<Switch checked={sound} onCheckedChange={setSound} id="sound" />
				</div>

				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<Eye className="h-4 w-4 text-muted-foreground" />
						<span className="text-sm font-medium">公開プロフィール</span>
					</div>
					<Switch checked={visibility} onCheckedChange={setVisibility} id="visibility" />
				</div>
			</div>
		);
	},
};

// Age rating filter example (matching our implementation)
export const AgeRatingFilter: Story = {
	render: () => {
		const [showR18, setShowR18] = useState(true); // Default: R18 shown for adults
		const isAdult = true; // Simulated adult user

		return (
			<div className="space-y-4">
				<h3 className="text-lg font-semibold">年齢レーティングフィルター</h3>

				{isAdult ? (
					<div className="flex items-center gap-3 px-3 py-2 border border-border rounded-md bg-background">
						<Shield className="h-4 w-4 text-muted-foreground" />
						<div className="flex items-center gap-2">
							<span className="text-sm font-medium">R18作品表示</span>
							<Switch
								checked={showR18}
								onCheckedChange={setShowR18}
								aria-label="R18作品の表示を切り替え"
							/>
						</div>
					</div>
				) : (
					<div className="flex items-center gap-3 px-3 py-2 border border-blue-200 rounded-md bg-blue-50">
						<Shield className="h-4 w-4 text-blue-600" />
						<span className="text-sm text-blue-700 font-medium">全年齢対象作品のみ表示中</span>
					</div>
				)}

				<p className="text-xs text-muted-foreground">
					現在の状態:{" "}
					{showR18 ? "R18作品表示中 (excludeR18=false)" : "全年齢対象のみ (excludeR18=true)"}
				</p>
			</div>
		);
	},
};

// Multiple switches with different states
export const MultipleStates: Story = {
	render: () => {
		return (
			<div className="grid grid-cols-2 gap-6 p-6 bg-background">
				<div className="space-y-3">
					<p className="text-sm font-medium text-foreground">デフォルト (OFF)</p>
					<div className="flex items-center gap-3">
						<Switch checked={false} />
						<span className="text-xs text-muted-foreground">グレー背景</span>
					</div>
				</div>

				<div className="space-y-3">
					<p className="text-sm font-medium text-foreground">チェック済み (ON)</p>
					<div className="flex items-center gap-3">
						<Switch checked={true} />
						<span className="text-xs text-suzuka-600">suzuka-500 背景</span>
					</div>
				</div>

				<div className="space-y-3">
					<p className="text-sm font-medium text-foreground">無効化 (OFF)</p>
					<div className="flex items-center gap-3">
						<Switch checked={false} disabled />
						<span className="text-xs text-muted-foreground">無効状態</span>
					</div>
				</div>

				<div className="space-y-3">
					<p className="text-sm font-medium text-foreground">無効化 (ON)</p>
					<div className="flex items-center gap-3">
						<Switch checked={true} disabled />
						<span className="text-xs text-muted-foreground">無効状態</span>
					</div>
				</div>
			</div>
		);
	},
};

// Brand colors demonstration
export const BrandColors: Story = {
	render: () => {
		const [suzukaChecked, setSuzukaChecked] = useState(true);
		const [minaseChecked, setMinaseChecked] = useState(false);

		return (
			<div className="space-y-6 p-6">
				<h3 className="text-lg font-semibold">ブランドカラーでのSwitch表示</h3>

				<div className="space-y-4">
					<div className="flex items-center gap-4">
						<Switch checked={suzukaChecked} onCheckedChange={setSuzukaChecked} />
						<div>
							<span className="text-sm font-medium">suzuka-500 (Primary)</span>
							<p className="text-xs text-muted-foreground">デフォルトのプライマリカラー</p>
						</div>
					</div>

					<div className="flex items-center gap-4">
						<Switch
							checked={minaseChecked}
							onCheckedChange={setMinaseChecked}
							className="data-[state=checked]:bg-minase-500"
						/>
						<div>
							<span className="text-sm font-medium">minase-500 (Secondary)</span>
							<p className="text-xs text-muted-foreground">セカンダリカラーでのカスタマイズ例</p>
						</div>
					</div>
				</div>

				<div className="mt-6 p-4 border rounded-lg bg-muted/50">
					<h4 className="font-medium mb-2">カラー使用例</h4>
					<ul className="text-sm text-muted-foreground space-y-1">
						<li>
							• <strong>suzuka-500</strong>: メインの設定項目
						</li>
						<li>
							• <strong>minase-500</strong>: 特別な機能（R18フィルターなど）
						</li>
					</ul>
				</div>
			</div>
		);
	},
};
