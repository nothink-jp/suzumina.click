import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import { AudioOnlyPlayer } from "./audio-only-player";

const meta = {
	title: "Custom/AudioOnlyPlayer",
	component: AudioOnlyPlayer,
	parameters: {
		layout: "padded",
	},
	tags: ["autodocs"],
} satisfies Meta<typeof AudioOnlyPlayer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
	args: {
		videoId: "dQw4w9WgXcQ",
		startTime: 0,
		endTime: 10,
		onReady: fn(),
		onPlay: fn(),
		onPause: fn(),
		onEnd: fn(),
		onError: fn(),
	},
};

export const WithAutoPlay: Story = {
	args: {
		videoId: "dQw4w9WgXcQ",
		startTime: 5,
		endTime: 15,
		autoPlay: true,
		onReady: fn(),
		onPlay: fn(),
		onPause: fn(),
		onEnd: fn(),
		onError: fn(),
	},
};

export const NoEndTime: Story = {
	args: {
		videoId: "dQw4w9WgXcQ",
		startTime: 30,
		onReady: fn(),
		onPlay: fn(),
		onPause: fn(),
		onEnd: fn(),
		onError: fn(),
	},
};

export const CustomVolume: Story = {
	args: {
		videoId: "dQw4w9WgXcQ",
		startTime: 0,
		endTime: 5,
		volume: 25,
		onReady: fn(),
		onPlay: fn(),
		onPause: fn(),
		onEnd: fn(),
		onError: fn(),
	},
};
