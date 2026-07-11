import type { Meta, StoryObj } from "@storybook/react-vite";
import { MetaPillRow } from "./meta-pill-row";

const meta: Meta<typeof MetaPillRow> = {
	title: "Custom/Audio/MetaPillRow",
	component: MetaPillRow,
	parameters: {
		layout: "centered",
		docs: {
			description: {
				component:
					"メタピル行（ボタン画面刷新の共通部品）。再生回数・尺・作成日・作成者をピル型で表示する純表示部品。",
			},
		},
	},
	tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof MetaPillRow>;

export const Default: Story = {
	args: { playCount: 7, durationText: "3.4秒", dateText: "2026/06/26" },
};

export const WithFavoriteCount: Story = {
	args: { playCount: 34, durationText: "1.8秒", dateText: "2026/06/26", favoriteCount: 5 },
};

export const Playing: Story = {
	args: { playCount: 8, durationText: "3.4秒", dateText: "2026/06/26", isPlaying: true },
};

export const WithCreator: Story = {
	args: {
		playCount: 21,
		durationText: "3.8秒",
		dateText: "2026/06/26",
		creatorName: "がこんがこん",
	},
};
