import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "@storybook/test";
import type { FrontendAudioButtonData } from "@suzumina.click/shared-types";
import { SimpleAudioButton } from "./simple-audio-button";

const meta = {
	title: "Custom/SimpleAudioButton",
	component: SimpleAudioButton,
	parameters: {
		layout: "padded",
	},
	tags: ["autodocs"],
} satisfies Meta<typeof SimpleAudioButton>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockAudioButton: FrontendAudioButtonData = {
	id: "1",
	title: "おはよう！",
	description: "朝の挨拶音声",
	category: "voice" as const,
	tags: ["挨拶", "朝"],
	sourceVideoId: "dQw4w9WgXcQ",
	sourceVideoTitle: "涼花みなせ 朝配信 2024/06/26",
	sourceVideoThumbnailUrl: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
	startTime: 120,
	endTime: 123,
	uploadedBy: "user123",
	uploadedByName: "テストユーザー",
	isPublic: true,
	playCount: 1234,
	likeCount: 567,
	createdAt: "2024-06-26T00:00:00.000Z",
	updatedAt: "2024-06-26T00:00:00.000Z",
	durationText: "3秒",
	relativeTimeText: "1日前",
};

export const Default: Story = {
	args: {
		audioButton: mockAudioButton,
		onPlay: fn(),
	},
};

export const LongTitle: Story = {
	args: {
		audioButton: {
			...mockAudioButton,
			title:
				"これはとても長いタイトルのボタンです。レイアウトがどうなるか確認しています。この文章は100文字を超えるように書いているので、途中で切り取られることを確認するためのテストケースです。",
		},
		onPlay: fn(),
	},
};

export const ShortTitle: Story = {
	args: {
		audioButton: {
			...mockAudioButton,
			title: "短い",
		},
		onPlay: fn(),
	},
};

export const MediumTitle: Story = {
	args: {
		audioButton: {
			...mockAudioButton,
			title: "中程度の長さのタイトルです",
		},
		onPlay: fn(),
	},
};

export const CustomMaxLength: Story = {
	args: {
		audioButton: {
			...mockAudioButton,
			title: "カスタム文字数制限のテストです。この文章は30文字を超えています。",
		},
		maxTitleLength: 30,
		onPlay: fn(),
	},
};

export const LongDuration: Story = {
	args: {
		audioButton: {
			...mockAudioButton,
			endTime: 180, // 長い音声（60秒）
		},
		onPlay: fn(),
	},
};

export const HighPlayCount: Story = {
	args: {
		audioButton: {
			...mockAudioButton,
			playCount: 999999,
		},
		onPlay: fn(),
	},
};

export const VariableWidths: Story = {
	render: () => (
		<div className="flex flex-wrap gap-3 items-start">
			<SimpleAudioButton audioButton={mockAudioButton} onPlay={fn()} />
			<SimpleAudioButton
				audioButton={{
					...mockAudioButton,
					id: "2",
					title: "短い",
				}}
				onPlay={fn()}
			/>
			<SimpleAudioButton
				audioButton={{
					...mockAudioButton,
					id: "3",
					title: "中程度の長さのタイトル",
				}}
				onPlay={fn()}
			/>
			<SimpleAudioButton
				audioButton={{
					...mockAudioButton,
					id: "4",
					title: "とても長いタイトルのボタンです。文字数制限によって切り取られます。",
				}}
				onPlay={fn()}
			/>
		</div>
	),
};

export const Grid: Story = {
	render: () => (
		<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
			<SimpleAudioButton audioButton={mockAudioButton} onPlay={fn()} />
			<SimpleAudioButton
				audioButton={{
					...mockAudioButton,
					id: "2",
					title: "ありがとう",
				}}
				onPlay={fn()}
			/>
			<SimpleAudioButton
				audioButton={{
					...mockAudioButton,
					id: "3",
					title: "がんばって！",
				}}
				onPlay={fn()}
			/>
			<SimpleAudioButton
				audioButton={{
					...mockAudioButton,
					id: "4",
					title: "おやすみ",
				}}
				onPlay={fn()}
			/>
			<SimpleAudioButton
				audioButton={{
					...mockAudioButton,
					id: "5",
					title: "大好き！",
				}}
				onPlay={fn()}
			/>
			<SimpleAudioButton
				audioButton={{
					...mockAudioButton,
					id: "6",
					title: "またね！",
				}}
				onPlay={fn()}
			/>
		</div>
	),
};
