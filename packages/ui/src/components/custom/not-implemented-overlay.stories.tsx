import type { Meta, StoryObj } from "@storybook/react";
import NotImplementedOverlay from "./not-implemented-overlay";

const meta = {
	title: "Custom/NotImplementedOverlay",
	component: NotImplementedOverlay,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
	argTypes: {
		title: {
			control: "text",
			description: "オーバーレイのタイトル",
		},
		description: {
			control: "text",
			description: "オーバーレイの説明文",
		},
		className: {
			control: "text",
			description: "追加のCSSクラス",
		},
	},
} satisfies Meta<typeof NotImplementedOverlay>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {},
	decorators: [
		(Story) => (
			<div className="relative w-[600px] h-[400px] bg-gray-100 rounded-lg">
				<div className="p-8">
					<h2 className="text-2xl font-bold mb-4">Sample Content</h2>
					<p className="text-gray-600">This is the content that will be overlaid.</p>
				</div>
				<Story />
			</div>
		),
	],
};

export const CustomTitle: Story = {
	args: {
		title: "メンテナンス中",
		description: "システムメンテナンスのため、一時的にご利用いただけません。",
	},
	decorators: Default.decorators,
};

export const LongDescription: Story = {
	args: {
		title: "新機能を開発中",
		description:
			"この機能は現在開発チームが鋭意制作中です。より良いユーザー体験を提供するため、もう少々お時間をいただいております。完成まで今しばらくお待ちください。",
	},
	decorators: Default.decorators,
};

export const CustomStyling: Story = {
	args: {
		className: "bg-blue-500/30",
		title: "Coming Soon",
		description: "This feature will be available soon!",
	},
	decorators: Default.decorators,
};

export const InlineUsage: Story = {
	args: {},
	decorators: [
		(Story) => (
			<div className="flex gap-4">
				<div className="relative w-[300px] h-[200px] bg-white border rounded-lg shadow-sm">
					<div className="p-4">
						<h3 className="font-semibold mb-2">Feature A</h3>
						<p className="text-sm text-gray-600">This feature is not yet implemented.</p>
					</div>
					<Story />
				</div>
				<div className="w-[300px] h-[200px] bg-white border rounded-lg shadow-sm p-4">
					<h3 className="font-semibold mb-2">Feature B</h3>
					<p className="text-sm text-gray-600">This feature is available.</p>
				</div>
			</div>
		),
	],
};
