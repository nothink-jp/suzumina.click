import type { Meta, StoryObj } from "@storybook/react-vite";
import { fn } from "storybook/test";
import { YouTubePlayer } from "./youtube-player";

const meta = {
	title: "Custom/Audio/YouTubePlayer",
	component: YouTubePlayer,
	parameters: {
		layout: "padded",
		// 実 YouTube iframe を埋め込むため、再生フレーム/ポスター/読み込み状態が毎回変わり
		// Chromatic で安定したスナップショットが撮れない。視覚回帰の対象外として無効化（SPR-130）
		chromatic: { disableSnapshot: true },
	},
	tags: ["autodocs"],
} satisfies Meta<typeof YouTubePlayer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		videoId: "dQw4w9WgXcQ",
		width: 560,
		height: 315,
		onReady: fn(),
		onStateChange: fn(),
		onTimeUpdate: fn(),
		onError: fn(),
	},
};

export const WithTimeRange: Story = {
	args: {
		videoId: "dQw4w9WgXcQ",
		width: 560,
		height: 315,
		startTime: 10,
		endTime: 30,
		onReady: fn(),
		onStateChange: fn(),
		onTimeUpdate: fn(),
		onError: fn(),
	},
};

export const AutoPlay: Story = {
	args: {
		videoId: "dQw4w9WgXcQ",
		width: 560,
		height: 315,
		autoplay: true,
		onReady: fn(),
		onStateChange: fn(),
		onTimeUpdate: fn(),
		onError: fn(),
	},
};

export const NoControls: Story = {
	args: {
		videoId: "dQw4w9WgXcQ",
		width: 560,
		height: 315,
		controls: false,
		onReady: fn(),
		onStateChange: fn(),
		onTimeUpdate: fn(),
		onError: fn(),
	},
};

export const Responsive: Story = {
	args: {
		videoId: "dQw4w9WgXcQ",
		width: "100%",
		height: "100%",
		onReady: fn(),
		onStateChange: fn(),
		onTimeUpdate: fn(),
		onError: fn(),
	},
	decorators: [
		(Story) => (
			<div style={{ width: "800px", height: "450px", maxWidth: "100%" }}>
				<Story />
			</div>
		),
	],
};
