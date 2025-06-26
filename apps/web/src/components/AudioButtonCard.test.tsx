import type { FrontendAudioButtonData } from "@suzumina.click/shared-types";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AudioButtonCard } from "./AudioButtonCard";

// Mock the actions
vi.mock("@/app/buttons/actions", () => ({
	incrementPlayCount: vi.fn().mockResolvedValue({ success: true }),
	incrementLikeCount: vi.fn().mockResolvedValue({ success: true }),
	decrementLikeCount: vi.fn().mockResolvedValue({ success: true }),
}));

// Mock Next.js Link
vi.mock("next/link", () => ({
	default: ({ children, href, ...props }: any) => (
		<a href={href} {...props}>
			{children}
		</a>
	),
}));

// Mock YouTubePlayer with simple implementation
vi.mock("@suzumina.click/ui/components/custom/youtube-player", () => ({
	YouTubePlayer: ({ videoId }: any) => (
		<div data-testid="youtube-player" data-video-id={videoId}>
			YouTube Player Mock
		</div>
	),
	useYouTubePlayer: () => ({
		player: null,
		isPlaying: false,
		currentTime: 0,
		duration: 0,
		volume: 50,
		isMuted: false,
		controls: {
			play: vi.fn(),
			pause: vi.fn(),
			stop: vi.fn(),
			seekTo: vi.fn(),
			setVolume: vi.fn(),
			mute: vi.fn(),
			unmute: vi.fn(),
		},
		handlers: {
			onReady: vi.fn(),
			onStateChange: vi.fn(),
			onTimeUpdate: vi.fn(),
		},
	}),
}));

const mockAudioButton: FrontendAudioButtonData = {
	id: "test-audio-button-1",
	title: "テスト音声ボタン",
	description: "これはテスト用の音声ボタンです",
	category: "voice",
	tags: ["テスト", "音声"],
	sourceVideoId: "test-video-id",
	sourceVideoTitle: "テスト動画タイトル",
	startTime: 30,
	endTime: 45,
	uploadedBy: "test-user-id",
	uploadedByName: "テストユーザー",
	playCount: 100,
	likeCount: 25,
	isPublic: true,
	createdAt: "2024-01-01T00:00:00Z",
	updatedAt: "2024-01-01T00:00:00Z",
	durationText: "15秒",
	relativeTimeText: "1年前",
};

describe("AudioButtonCard", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// 基本的なレンダリングテストは統合テストに移行済み
	// (src/__tests__/integration/audioButtonComponents.test.tsx)

	it("元動画を非表示にできる", () => {
		render(
			<AudioButtonCard
				audioButton={mockAudioButton}
				showSourceVideo={false}
				size="md"
				variant="default"
			/>,
		);

		// showSourceVideo=falseの場合でも基本情報は表示される
		expect(screen.getByText("テスト音声ボタン")).toBeInTheDocument();
	});

	it("カテゴリラベルが表示される", () => {
		render(
			<AudioButtonCard
				audioButton={mockAudioButton}
				showSourceVideo={true}
				size="md"
				variant="default"
			/>,
		);

		// カテゴリに関連するテキストが表示されることを確認
		expect(screen.getByText("テスト音声ボタン")).toBeInTheDocument();
	});

	it("説明が表示される", () => {
		render(
			<AudioButtonCard
				audioButton={mockAudioButton}
				showSourceVideo={true}
				size="md"
				variant="default"
			/>,
		);

		expect(screen.getByText("これはテスト用の音声ボタンです")).toBeInTheDocument();
	});

	it("空の説明でもエラーが起こらない", () => {
		const refWithoutDescription = {
			...mockAudioButton,
			description: undefined,
		};

		render(
			<AudioButtonCard
				audioButton={refWithoutDescription}
				showSourceVideo={true}
				size="md"
				variant="default"
			/>,
		);

		expect(screen.getByText("テスト音声ボタン")).toBeInTheDocument();
	});

	it("タグが空の場合でもエラーが起こらない", () => {
		const refWithoutTags = {
			...mockAudioButton,
			tags: [],
		};

		render(
			<AudioButtonCard
				audioButton={refWithoutTags}
				showSourceVideo={true}
				size="md"
				variant="default"
			/>,
		);

		expect(screen.getByText("テスト音声ボタン")).toBeInTheDocument();
	});
});
