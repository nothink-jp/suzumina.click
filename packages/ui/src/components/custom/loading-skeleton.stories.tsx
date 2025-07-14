import type { Meta, StoryObj } from "@storybook/react";
import { LoadingSkeleton } from "./loading-skeleton";

const meta = {
	title: "Custom/LoadingSkeleton",
	component: LoadingSkeleton,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
	argTypes: {
		variant: {
			control: "select",
			options: ["carousel", "form", "menu", "card"],
			description: "スケルトンのバリアント",
		},
		height: {
			control: { type: "number", min: 50, max: 500 },
			description: "スケルトンの高さ（px）",
		},
		className: {
			control: "text",
			description: "追加のCSSクラス",
		},
	},
} satisfies Meta<typeof LoadingSkeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Carousel: Story = {
	args: {
		variant: "carousel",
		height: 200,
	},
};

export const Form: Story = {
	args: {
		variant: "form",
		height: 200,
	},
};

export const Menu: Story = {
	args: {
		variant: "menu",
		height: 200,
	},
};

export const Card: Story = {
	args: {
		variant: "card",
		height: 200,
	},
};

export const CustomHeight: Story = {
	args: {
		variant: "card",
		height: 350,
		className: "w-96",
	},
};

export const WithCustomClass: Story = {
	args: {
		variant: "carousel",
		height: 200,
		className: "shadow-lg rounded-xl",
	},
};
