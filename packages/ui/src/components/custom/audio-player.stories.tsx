import type { Meta, StoryObj } from "@storybook/react-vite";
import type { FrontendAudioButtonData } from "@suzumina.click/shared-types";
import { useRef } from "react";
import { fn } from "storybook/test";
import { type AudioControls, AudioPlayer } from "./audio-player";

const meta = {
	title: "Custom/Audio/AudioPlayer",
	component: AudioPlayer,
	parameters: {
		layout: "padded",
		docs: {
			description: {
				component:
					"プール化された音声プレイヤー（DOM要素なし）。YouTube Player プールを使用してメモリ効率を向上させています。",
			},
		},
		// ヘッドレスな音声プレイヤーで、YouTube iframe がオフスクリーンの巨大座標に描画され
		// Chromatic のキャプチャ上限(25M px)を超える。視覚的回帰の対象として無意味なため snapshot を無効化（SPR-130）
		chromatic: { disableSnapshot: true },
	},
	tags: ["autodocs"],
} satisfies Meta<typeof AudioPlayer>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockAudioButton: FrontendAudioButtonData = {
	id: "1",
	title: "おはよう！",
	description: "朝の挨拶音声",
	tags: ["挨拶", "朝"],
	sourceVideoId: "dQw4w9WgXcQ",
	sourceVideoTitle: "涼花みなせ 朝配信 2024/06/26",
	sourceVideoThumbnailUrl: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
	startTime: 120,
	endTime: 123,
	createdBy: "user123",
	createdByName: "テストユーザー",
	isPublic: true,
	playCount: 1234,
	likeCount: 567,
	dislikeCount: 0,
	favoriteCount: 0,
	createdAt: "2024-06-26T00:00:00.000Z",
	updatedAt: "2024-06-26T00:00:00.000Z",
	durationText: "3秒",
	relativeTimeText: "1日前",
};

export const Default: Story = {
	args: {
		audioButton: mockAudioButton,
		onPlay: fn(),
		onPause: fn(),
		onEnd: fn(),
	},
	render: (args) => {
		return (
			<div className="p-4">
				<p className="text-sm text-gray-600 mb-4">
					AudioPlayerは DOM要素を持たないため、この表示では音声制御のコンポーネントです。
					実際の使用では、他のコンポーネント（AudioButtonなど）と組み合わせて使用します。
				</p>
				<AudioPlayer {...args} />
				<div className="mt-4 p-4 bg-gray-50 rounded">
					<p className="text-sm font-medium">音声データ:</p>
					<p className="text-xs text-gray-600">タイトル: {args.audioButton.title}</p>
					<p className="text-xs text-gray-600">
						時間: {args.audioButton.startTime}s - {args.audioButton.endTime}s
					</p>
					<p className="text-xs text-gray-600">動画ID: {args.audioButton.sourceVideoId}</p>
				</div>
			</div>
		);
	},
};

export const WithControls: Story = {
	args: {
		audioButton: mockAudioButton,
		onPlay: fn(),
		onPause: fn(),
		onEnd: fn(),
		volume: 75,
	},
	render: (args) => {
		const audioRef = useRef<AudioControls>(null);

		return (
			<div className="p-4 space-y-4">
				<AudioPlayer ref={audioRef} {...args} />

				<div className="space-y-3">
					<h3 className="font-medium">制御ボタン</h3>
					<div className="flex gap-2">
						<button
							type="button"
							onClick={() => audioRef.current?.play()}
							className="px-3 py-2 bg-blue-700 text-white rounded hover:bg-blue-800"
						>
							再生
						</button>
						<button
							type="button"
							onClick={() => audioRef.current?.pause()}
							className="px-3 py-2 bg-yellow-400 text-gray-900 rounded hover:bg-yellow-500"
						>
							一時停止
						</button>
						<button
							type="button"
							onClick={() => audioRef.current?.stop()}
							className="px-3 py-2 bg-red-700 text-white rounded hover:bg-red-800"
						>
							停止
						</button>
					</div>

					<div className="space-y-2">
						<label className="block text-sm font-medium">音量</label>
						<input
							type="range"
							aria-label="音量"
							min="0"
							max="100"
							defaultValue="75"
							onChange={(e) => audioRef.current?.setVolume(Number(e.target.value))}
							className="w-full"
						/>
					</div>
				</div>

				<div className="p-4 bg-gray-50 rounded">
					<p className="text-sm font-medium">音声データ:</p>
					<p className="text-xs text-gray-600">タイトル: {args.audioButton.title}</p>
					<p className="text-xs text-gray-600">
						時間: {args.audioButton.startTime}s - {args.audioButton.endTime}s
					</p>
				</div>
			</div>
		);
	},
};

export const AutoPlay: Story = {
	args: {
		audioButton: mockAudioButton,
		onPlay: fn(),
		onPause: fn(),
		onEnd: fn(),
		autoPlay: true,
		volume: 30,
	},
};
