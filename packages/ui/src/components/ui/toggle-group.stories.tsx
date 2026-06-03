import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { ToggleGroup, ToggleGroupItem } from "./toggle-group";

const meta = {
	title: "UI/ToggleGroup",
	component: ToggleGroup,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
	decorators: [
		(Story) => (
			<div className="w-[360px]">
				<Story />
			</div>
		),
	],
} satisfies Meta<typeof ToggleGroup>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Single: Story = {
	render: () => (
		<ToggleGroup type="single" defaultValue="buttons" aria-label="検索対象">
			<ToggleGroupItem value="buttons">音声ボタン</ToggleGroupItem>
			<ToggleGroupItem value="videos">動画</ToggleGroupItem>
			<ToggleGroupItem value="works">作品</ToggleGroupItem>
		</ToggleGroup>
	),
};

export const FullWidth: Story = {
	render: () => (
		<ToggleGroup
			type="single"
			defaultValue="buttons"
			aria-label="検索対象"
			className="grid w-full grid-cols-3"
		>
			<ToggleGroupItem value="buttons" className="w-full">
				音声ボタン
			</ToggleGroupItem>
			<ToggleGroupItem value="videos" className="w-full">
				動画
			</ToggleGroupItem>
			<ToggleGroupItem value="works" className="w-full">
				作品
			</ToggleGroupItem>
		</ToggleGroup>
	),
};

export const SwitchSelection: Story = {
	render: () => (
		<ToggleGroup type="single" defaultValue="buttons" aria-label="検索対象">
			<ToggleGroupItem value="buttons">音声ボタン</ToggleGroupItem>
			<ToggleGroupItem value="videos">動画</ToggleGroupItem>
			<ToggleGroupItem value="works">作品</ToggleGroupItem>
		</ToggleGroup>
	),
	play: async ({ canvasElement }) => {
		const canvas = within(canvasElement);
		const buttons = canvas.getByRole("radio", { name: "音声ボタン" });
		await expect(buttons).toHaveAttribute("data-state", "on");

		const videos = canvas.getByRole("radio", { name: "動画" });
		await userEvent.click(videos);
		await expect(videos).toHaveAttribute("data-state", "on");
		await expect(buttons).toHaveAttribute("data-state", "off");
	},
};
