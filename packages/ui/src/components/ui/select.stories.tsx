import type { Meta, StoryObj } from "@storybook/react";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./select";

const meta = {
	title: "UI/Select",
	component: Select,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
	decorators: [
		(Story) => (
			<div className="w-[200px]">
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => (
		<Select>
			<SelectTrigger>
				<SelectValue placeholder="Select a fruit" />
			</SelectTrigger>
			<SelectContent>
				<SelectItem value="apple">Apple</SelectItem>
				<SelectItem value="banana">Banana</SelectItem>
				<SelectItem value="blueberry">Blueberry</SelectItem>
				<SelectItem value="grapes">Grapes</SelectItem>
				<SelectItem value="pineapple">Pineapple</SelectItem>
			</SelectContent>
		</Select>
	),
};

export const WithDefaultValue: Story = {
	render: () => (
		<Select defaultValue="banana">
			<SelectTrigger>
				<SelectValue placeholder="Select a fruit" />
			</SelectTrigger>
			<SelectContent>
				<SelectItem value="apple">Apple</SelectItem>
				<SelectItem value="banana">Banana</SelectItem>
				<SelectItem value="blueberry">Blueberry</SelectItem>
				<SelectItem value="grapes">Grapes</SelectItem>
				<SelectItem value="pineapple">Pineapple</SelectItem>
			</SelectContent>
		</Select>
	),
};

export const Disabled: Story = {
	render: () => (
		<Select disabled>
			<SelectTrigger>
				<SelectValue placeholder="Select a fruit" />
			</SelectTrigger>
			<SelectContent>
				<SelectItem value="apple">Apple</SelectItem>
				<SelectItem value="banana">Banana</SelectItem>
			</SelectContent>
		</Select>
	),
};
