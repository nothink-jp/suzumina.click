import type { Meta, StoryObj } from "@storybook/react-vite";
import { Bold } from "lucide-react";
import { expect, userEvent, within } from "storybook/test";
import { Toggle } from "./toggle";

const meta = {
	title: "UI/Toggle",
	component: Toggle,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
} satisfies Meta<typeof Toggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => <Toggle aria-label="太字">太字</Toggle>,
};

export const Outline: Story = {
	render: () => (
		<Toggle variant="outline" aria-label="太字">
			太字
		</Toggle>
	),
};

export const WithIcon: Story = {
	render: () => (
		<Toggle aria-label="太字">
			<Bold />
		</Toggle>
	),
};

export const Sizes: Story = {
	render: () => (
		<div className="flex items-center gap-2">
			<Toggle size="sm" aria-label="小">
				S
			</Toggle>
			<Toggle size="default" aria-label="中">
				M
			</Toggle>
			<Toggle size="lg" aria-label="大">
				L
			</Toggle>
		</div>
	),
};

// active(on) がブランド色（primary）になることを検証（ADR-011 の in-file 例外）
export const TogglesOn: Story = {
	render: () => <Toggle aria-label="太字">太字</Toggle>,
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const toggle = canvas.getByRole("button", { name: "太字" });
		await expect(toggle).not.toHaveAttribute("data-pressed");
		await userEvent.click(toggle);
		await expect(toggle).toHaveAttribute("data-pressed");
	},
};
