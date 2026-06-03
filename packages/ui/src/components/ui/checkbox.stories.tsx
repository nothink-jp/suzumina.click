import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";
import { expect, fn, userEvent, within } from "storybook/test";

import { Checkbox } from "./checkbox";

const meta = {
	title: "UI/Checkbox",
	component: Checkbox,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
	// ラベル無しの単体デモには既定のアクセシブル名を与える（a11y: button-name。SPR-132）
	args: { "aria-label": "選択" },
	argTypes: {
		disabled: {
			control: { type: "boolean" },
		},
		checked: {
			control: { type: "select" },
			options: [true, false, "indeterminate"],
		},
	},
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {},
};

export const Checked: Story = {
	args: {
		checked: true,
	},
};

export const Indeterminate: Story = {
	args: {
		checked: "indeterminate",
	},
};

export const Disabled: Story = {
	args: {
		disabled: true,
	},
};

export const CheckedDisabled: Story = {
	args: {
		checked: true,
		disabled: true,
	},
};

export const WithLabel: Story = {
	render: () => {
		const id = React.useId();
		return (
			<div className="flex items-center space-x-2">
				<Checkbox id={id} />
				<label
					htmlFor={id}
					className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
				>
					Accept terms and conditions
				</label>
			</div>
		);
	},
};

export const ToggleInteraction: Story = {
	args: {
		onCheckedChange: fn(),
	},
	play: async ({ canvasElement, args }) => {
		const canvas = within(canvasElement);
		const checkbox = canvas.getByRole("checkbox");
		await expect(checkbox).not.toBeChecked();
		await userEvent.click(checkbox);
		await expect(args.onCheckedChange).toHaveBeenCalledWith(true);
	},
};
