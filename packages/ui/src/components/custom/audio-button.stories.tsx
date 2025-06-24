import type { Meta, StoryObj } from "@storybook/react";
import { AudioButton } from "./audio-button.js";

const meta: Meta<typeof AudioButton> = {
	title: "Custom/AudioButton",
	component: AudioButton,
	parameters: {
		layout: "centered",
	},
	tags: ["autodocs"],
	argTypes: {
		size: {
			control: { type: "select" },
			options: ["sm", "md", "lg"],
		},
		category: {
			control: { type: "select" },
			options: ["voice", "bgm", "se", "talk", "singing", "other"],
		},
		autoPlay: {
			control: { type: "boolean" },
		},
		disabled: {
			control: { type: "boolean" },
		},
	},
};

export default meta;
type Story = StoryObj<typeof meta>;

// サンプル音声URL
const sampleAudioUrl = "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav";

export const Default: Story = {
	args: {
		audioUrl: sampleAudioUrl,
		title: "サンプル音声ボタン",
		duration: 83,
		category: "voice",
		size: "md",
	},
};

export const VoiceCategory: Story = {
	args: {
		audioUrl: sampleAudioUrl,
		title: "ボイスサンプル",
		duration: 45,
		category: "voice",
		size: "md",
	},
};

export const BGMCategory: Story = {
	args: {
		audioUrl: sampleAudioUrl,
		title: "BGMサンプル",
		duration: 120,
		category: "bgm",
		size: "md",
	},
};

export const SECategory: Story = {
	args: {
		audioUrl: sampleAudioUrl,
		title: "効果音サンプル",
		duration: 3,
		category: "se",
		size: "md",
	},
};

export const Small: Story = {
	args: {
		audioUrl: sampleAudioUrl,
		title: "小さなボタン",
		duration: 30,
		category: "talk",
		size: "sm",
	},
};

export const Large: Story = {
	args: {
		audioUrl: sampleAudioUrl,
		title: "大きなボタン",
		duration: 150,
		category: "singing",
		size: "lg",
	},
};

export const WithoutDuration: Story = {
	args: {
		audioUrl: sampleAudioUrl,
		title: "時間表示なし",
		category: "other",
		size: "md",
	},
};

export const Disabled: Story = {
	args: {
		audioUrl: sampleAudioUrl,
		title: "無効化されたボタン",
		duration: 60,
		category: "voice",
		size: "md",
		disabled: true,
	},
};

export const WithCallbacks: Story = {
	args: {
		audioUrl: sampleAudioUrl,
		title: "コールバック付き",
		duration: 75,
		category: "voice",
		size: "md",
		onPlay: () => console.log("再生開始"),
		onPause: () => console.log("一時停止"),
		onEnded: () => console.log("再生終了"),
		onError: (error: string) => console.error("エラー:", error),
		onPlayCountIncrement: () => console.log("再生回数カウント"),
	},
};

export const AutoPlay: Story = {
	args: {
		audioUrl: sampleAudioUrl,
		title: "自動再生",
		duration: 20,
		category: "voice",
		size: "md",
		autoPlay: true,
	},
};
