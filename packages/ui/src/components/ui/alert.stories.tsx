import type { Meta, StoryObj } from "@storybook/react";
import { AlertCircle, Terminal } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "./alert.js";

const meta = {
	title: "UI/Alert",
	component: Alert,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
	argTypes: {
		variant: {
			control: { type: "select" },
			options: ["default", "destructive"],
		},
	},
	decorators: [
		(Story) => (
			<div className="w-[400px]">
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof Alert>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => (
		<Alert>
			<Terminal className="h-4 w-4" />
			<AlertTitle>Heads up!</AlertTitle>
			<AlertDescription>You can add components to your app using the cli.</AlertDescription>
		</Alert>
	),
};

export const Destructive: Story = {
	render: () => (
		<Alert variant="destructive">
			<AlertCircle className="h-4 w-4" />
			<AlertTitle>Error</AlertTitle>
			<AlertDescription>Your session has expired. Please log in again.</AlertDescription>
		</Alert>
	),
};

export const WithoutIcon: Story = {
	render: () => (
		<Alert>
			<AlertTitle>Simple Alert</AlertTitle>
			<AlertDescription>This is an alert without an icon.</AlertDescription>
		</Alert>
	),
};
