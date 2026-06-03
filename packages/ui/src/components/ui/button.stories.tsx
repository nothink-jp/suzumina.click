import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";

import { Button } from "./button";

const meta = {
	title: "UI/Button",
	component: Button,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
	argTypes: {
		variant: {
			control: { type: "select" },
			options: ["default", "destructive", "outline", "secondary", "ghost", "link"],
		},
		size: {
			control: { type: "select" },
			options: ["default", "sm", "lg", "icon"],
		},
		asChild: {
			control: { type: "boolean" },
		},
		disabled: {
			control: { type: "boolean" },
		},
	},
	args: { onClick: fn() },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		children: "Button",
	},
};

export const Secondary: Story = {
	args: {
		variant: "secondary",
		children: "Secondary",
	},
};

export const Destructive: Story = {
	args: {
		variant: "destructive",
		children: "Destructive",
	},
};

export const Outline: Story = {
	args: {
		variant: "outline",
		children: "Outline",
	},
};

export const Ghost: Story = {
	args: {
		variant: "ghost",
		children: "Ghost",
	},
};

export const Link: Story = {
	args: {
		variant: "link",
		children: "Link",
	},
};

export const Small: Story = {
	args: {
		size: "sm",
		children: "Small",
	},
};

export const Large: Story = {
	args: {
		size: "lg",
		children: "Large",
	},
};

export const Icon: Story = {
	args: {
		size: "icon",
		children: "🔥",
	},
};

export const Disabled: Story = {
	args: {
		disabled: true,
		children: "Disabled",
	},
};

export const CustomSuzuka: Story = {
	args: {
		children: "Suzuka Style",
		className: "bg-suzuka-500 hover:bg-suzuka-600 text-white",
	},
};

export const CustomMinase: Story = {
	args: {
		children: "Minase Style",
		// minase(オレンジ)は明色のため白文字は AA 未満（2.32）。暗色文字で 4.5:1 を満たす（SPR-131）
		className: "bg-minase-500 hover:bg-minase-600 text-minase-950",
	},
};

export const Interaction: Story = {
	args: {
		children: "Click me",
	},
	play: async ({ canvasElement, args }) => {
		const canvas = within(canvasElement);
		const button = canvas.getByRole("button", { name: "Click me" });
		await userEvent.click(button);
		await expect(args.onClick).toHaveBeenCalledOnce();
	},
};

export const DisabledNotClickable: Story = {
	args: {
		children: "Disabled",
		disabled: true,
	},
	play: async ({ canvasElement, args }) => {
		const canvas = within(canvasElement);
		const button = canvas.getByRole("button", { name: "Disabled" });
		await expect(button).toBeDisabled();
		// disabled は pointer-events:none のため、クリック試行自体を許可（pointerEventsCheck:0）した上で
		// onClick が発火しないことを検証する。
		await userEvent.click(button, { pointerEventsCheck: 0 });
		await expect(args.onClick).not.toHaveBeenCalled();
	},
};
