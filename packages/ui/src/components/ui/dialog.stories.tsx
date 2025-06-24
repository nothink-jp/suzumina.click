import type { Meta, StoryObj } from "@storybook/react";
import * as React from "react";
import { Button } from "./button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "./dialog";
import { Input } from "./input";
import { Label } from "./label";

const meta = {
	title: "UI/Dialog",
	component: Dialog,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
} satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	render: () => {
		const nameId = React.useId();
		const usernameId = React.useId();
		return (
			<Dialog>
				<DialogTrigger asChild>
					<Button variant="outline">Open Dialog</Button>
				</DialogTrigger>
				<DialogContent className="sm:max-w-[425px]">
					<DialogHeader>
						<DialogTitle>Edit profile</DialogTitle>
						<DialogDescription>
							Make changes to your profile here. Click save when you're done.
						</DialogDescription>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						<div className="grid grid-cols-4 items-center gap-4">
							<Label htmlFor={nameId} className="text-right">
								Name
							</Label>
							<Input id={nameId} defaultValue="Pedro Duarte" className="col-span-3" />
						</div>
						<div className="grid grid-cols-4 items-center gap-4">
							<Label htmlFor={usernameId} className="text-right">
								Username
							</Label>
							<Input id={usernameId} defaultValue="@peduarte" className="col-span-3" />
						</div>
					</div>
					<DialogFooter>
						<Button type="submit">Save changes</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		);
	},
};

export const Simple: Story = {
	render: () => (
		<Dialog>
			<DialogTrigger asChild>
				<Button>Simple Dialog</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Simple Dialog</DialogTitle>
					<DialogDescription>This is a simple dialog with minimal content.</DialogDescription>
				</DialogHeader>
			</DialogContent>
		</Dialog>
	),
};
