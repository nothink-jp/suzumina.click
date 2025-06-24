import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./button.js";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./card.js";

const meta = {
	title: "UI/Card",
	component: Card,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => (
		<Card className="w-[350px]">
			<CardHeader>
				<CardTitle>Card Title</CardTitle>
				<CardDescription>Card Description</CardDescription>
			</CardHeader>
			<CardContent>
				<p>Card content goes here.</p>
			</CardContent>
			<CardFooter>
				<Button>Action</Button>
			</CardFooter>
		</Card>
	),
};

export const Simple: Story = {
	render: () => (
		<Card className="w-[350px]">
			<CardContent className="pt-6">
				<p>Simple card with just content.</p>
			</CardContent>
		</Card>
	),
};

export const WithoutFooter: Story = {
	render: () => (
		<Card className="w-[350px]">
			<CardHeader>
				<CardTitle>No Footer Card</CardTitle>
				<CardDescription>This card doesn't have a footer section.</CardDescription>
			</CardHeader>
			<CardContent>
				<p>Content without footer.</p>
			</CardContent>
		</Card>
	),
};
