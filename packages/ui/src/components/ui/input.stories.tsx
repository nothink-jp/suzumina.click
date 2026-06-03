import type { Meta, StoryObj } from "@storybook/react-vite";

import { Input } from "./input";

const meta = {
	title: "UI/Input",
	component: Input,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
	// ラベル無しの単体デモ（args ベース）に既定名（a11y: label。SPR-132）
	args: { "aria-label": "入力" },
	argTypes: {
		type: {
			control: { type: "select" },
			options: ["text", "email", "password", "number", "search", "url", "tel"],
		},
		disabled: {
			control: { type: "boolean" },
		},
	},
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		placeholder: "Enter text...",
	},
};

export const Email: Story = {
	args: {
		type: "email",
		placeholder: "Enter email...",
	},
};

export const Password: Story = {
	args: {
		type: "password",
		placeholder: "Enter password...",
	},
};

export const Disabled: Story = {
	args: {
		placeholder: "Disabled input",
		disabled: true,
	},
};

export const WithValue: Story = {
	args: {
		defaultValue: "Pre-filled value",
	},
};
