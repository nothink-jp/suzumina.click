import type { Meta, StoryObj } from "@storybook/react-vite";
import { RabbitMark, SakuraMark } from "./brand-mark";

const meta = {
	title: "Custom/Brand/BrandMark",
	component: SakuraMark,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
	argTypes: {
		size: {
			control: { type: "range", min: 16, max: 256, step: 8 },
			description: "表示サイズ（px）。最小 16px",
		},
		className: {
			control: "text",
			description: "色は text-suzuka-* で指定（currentColor 継承）",
		},
	},
} satisfies Meta<typeof SakuraMark>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Sakura: Story = {
	args: {
		size: 96,
		className: "text-suzuka-500 dark:text-suzuka-600",
	},
};

export const Rabbit: Story = {
	args: {
		size: 96,
		className: "text-suzuka-500 dark:text-suzuka-600",
	},
	render: (args) => <RabbitMark {...args} />,
};

/** 基本の並び: うさぎ左・さくら右。うさぎ（縦長）基準で高さを揃える */
export const Pair: Story = {
	args: {
		size: 96,
	},
	render: (args) => (
		<div className="flex items-center gap-4">
			<RabbitMark {...args} className="text-suzuka-500 dark:text-suzuka-600" />
			<SakuraMark {...args} className="text-suzuka-400 dark:text-suzuka-500" />
		</div>
	),
};

/** 最小サイズ 16px から段階表示（16px 未満では使用しない） */
export const Sizes: Story = {
	render: () => (
		<div className="flex items-end gap-6 text-suzuka-500 dark:text-suzuka-600">
			{[16, 24, 32, 48, 96].map((size) => (
				<div key={size} className="flex flex-col items-center gap-2">
					<div className="flex items-end gap-2">
						<RabbitMark size={size} />
						<SakuraMark size={size} />
					</div>
					<span className="text-muted-foreground text-xs">{size}px</span>
				</div>
			))}
		</div>
	),
};

/** 淡色サブ表示（装飾・背景透かし向け） */
export const SubtleDecoration: Story = {
	render: () => (
		<div className="relative flex h-40 w-80 items-center justify-center overflow-hidden rounded-lg bg-suzuka-50 dark:bg-suzuka-950">
			<RabbitMark
				size={160}
				className="-right-6 absolute top-2 text-suzuka-200 dark:text-suzuka-800"
			/>
			<span className="relative font-medium text-suzuka-700 dark:text-suzuka-300">
				空状態・ヒーロー背景の装飾例
			</span>
		</div>
	),
};
