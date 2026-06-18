import type { Meta, StoryObj } from "@storybook/react-vite";
import { AlertCircle, AlertTriangle, CheckCircle, Info as InfoIcon, Terminal } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "./alert";

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
			options: ["default", "destructive", "info", "success", "warning"],
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

export const Info: Story = {
	render: () => (
		<Alert variant="info">
			<InfoIcon className="h-4 w-4" />
			<AlertTitle>お知らせ</AlertTitle>
			<AlertDescription>一般公開を開始しました。閲覧は誰でもご利用いただけます。</AlertDescription>
		</Alert>
	),
};

export const Success: Story = {
	render: () => (
		<Alert variant="success">
			<CheckCircle className="h-4 w-4" />
			<AlertTitle>保存しました</AlertTitle>
			<AlertDescription>設定が正常に保存されました。</AlertDescription>
		</Alert>
	),
};

export const Warning: Story = {
	render: () => (
		<Alert variant="warning">
			<AlertTriangle className="h-4 w-4" />
			<AlertTitle>注意</AlertTitle>
			<AlertDescription>この操作は取り消せません。続行する前にご確認ください。</AlertDescription>
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
