import type { Meta, StoryObj } from "@storybook/react";
import * as React from "react";
import { Button } from "./button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./card";
import { Input } from "./input";
import { Label } from "./label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";

const meta = {
	title: "UI/Tabs",
	component: Tabs,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
	decorators: [
		(Story) => (
			<div className="w-[400px]">
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => {
		const nameId = React.useId();
		const usernameId = React.useId();
		const currentId = React.useId();
		const newId = React.useId();
		return (
			<Tabs defaultValue="account" className="w-[400px]">
				<TabsList className="grid w-full grid-cols-2">
					<TabsTrigger value="account">Account</TabsTrigger>
					<TabsTrigger value="password">Password</TabsTrigger>
				</TabsList>
				<TabsContent value="account">
					<Card>
						<CardHeader>
							<CardTitle>Account</CardTitle>
							<CardDescription>
								Make changes to your account here. Click save when you're done.
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-2">
							<div className="space-y-1">
								<Label htmlFor={nameId}>Name</Label>
								<Input id={nameId} defaultValue="Pedro Duarte" />
							</div>
							<div className="space-y-1">
								<Label htmlFor={usernameId}>Username</Label>
								<Input id={usernameId} defaultValue="@peduarte" />
							</div>
						</CardContent>
						<CardFooter>
							<Button>Save changes</Button>
						</CardFooter>
					</Card>
				</TabsContent>
				<TabsContent value="password">
					<Card>
						<CardHeader>
							<CardTitle>Password</CardTitle>
							<CardDescription>
								Change your password here. After saving, you'll be logged out.
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-2">
							<div className="space-y-1">
								<Label htmlFor={currentId}>Current password</Label>
								<Input id={currentId} type="password" />
							</div>
							<div className="space-y-1">
								<Label htmlFor={newId}>New password</Label>
								<Input id={newId} type="password" />
							</div>
						</CardContent>
						<CardFooter>
							<Button>Save password</Button>
						</CardFooter>
					</Card>
				</TabsContent>
			</Tabs>
		);
	},
};

export const Simple: Story = {
	render: () => (
		<Tabs defaultValue="tab1">
			<TabsList>
				<TabsTrigger value="tab1">Tab 1</TabsTrigger>
				<TabsTrigger value="tab2">Tab 2</TabsTrigger>
				<TabsTrigger value="tab3">Tab 3</TabsTrigger>
			</TabsList>
			<TabsContent value="tab1" className="mt-4">
				<p>Content for Tab 1</p>
			</TabsContent>
			<TabsContent value="tab2" className="mt-4">
				<p>Content for Tab 2</p>
			</TabsContent>
			<TabsContent value="tab3" className="mt-4">
				<p>Content for Tab 3</p>
			</TabsContent>
		</Tabs>
	),
};
