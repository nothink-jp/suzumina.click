import type { Meta, StoryObj } from "@storybook/react";
import { AudioButtonSkeleton, generateSkeletonList } from "./audio-button-skeleton";

const meta = {
	title: "Custom/Audio/AudioButtonSkeleton",
	component: AudioButtonSkeleton,
	parameters: {
		layout: "padded",
	},
	tags: ["autodocs"],
} satisfies Meta<typeof AudioButtonSkeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {},
};

export const WithoutAnimation: Story = {
	args: {
		animated: false,
	},
};

export const CustomHeight: Story = {
	args: {
		height: 200,
	},
};

export const SmallHeight: Story = {
	args: {
		height: 100,
	},
};

export const SkeletonList: Story = {
	render: () => (
		<div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
			{generateSkeletonList(6)}
		</div>
	),
};

export const VariousHeights: Story = {
	render: () => (
		<div className="space-y-4">
			<div>
				<h3 className="text-sm font-medium mb-2">高さ: 100px</h3>
				<AudioButtonSkeleton height={100} />
			</div>
			<div>
				<h3 className="text-sm font-medium mb-2">高さ: 140px（デフォルト）</h3>
				<AudioButtonSkeleton />
			</div>
			<div>
				<h3 className="text-sm font-medium mb-2">高さ: 180px</h3>
				<AudioButtonSkeleton height={180} />
			</div>
		</div>
	),
};
