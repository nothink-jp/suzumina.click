import type { AudioButtonPlainObject } from "@suzumina.click/shared-types";
import { render, screen } from "@testing-library/react";
import { SessionProvider } from "next-auth/react";
import { describe, expect, it, vi } from "vitest";
import { UI_MESSAGES } from "@/constants/ui-messages";
import { FeaturedAudioButtonsCarousel } from "../featured-audio-buttons-carousel";

// AudioButtonWithPlayCount のモック
vi.mock("../AudioButtonWithPlayCount", () => ({
	AudioButtonWithPlayCount: ({ audioButton }: { audioButton: AudioButtonPlainObject }) => (
		<div data-testid="audio-button-with-favorite">
			<span data-testid="audio-button-title">{audioButton.title}</span>
			<span data-testid="audio-button-id">{audioButton.id}</span>
		</div>
	),
}));

// AudioButtonWithFavoriteClient のモック
vi.mock("../audio-button-with-favorite-client", () => ({
	AudioButtonWithFavoriteClient: ({ audioButton }: { audioButton: AudioButtonPlainObject }) => (
		<div data-testid="audio-button-with-favorite">
			<span data-testid="audio-button-title">{audioButton.title}</span>
			<span data-testid="audio-button-id">{audioButton.id}</span>
		</div>
	),
}));

// Mock auth.ts to avoid NextAuth module resolution issues
vi.mock("@/auth", () => ({
	auth: () => Promise.resolve(null),
}));

describe("FeaturedAudioButtonsCarousel", () => {
	const mockAudioButtons: AudioButtonPlainObject[] = [
		{
			id: "audio-1",
			title: "テスト音声ボタン1",
			description: "テスト用の音声ボタン",
			tags: ["テスト"],
			sourceVideoId: "video-1",
			sourceVideoTitle: "テスト動画1",
			sourceVideoThumbnailUrl: "https://img.youtube.com/vi/video-1/maxresdefault.jpg",
			startTime: 10,
			endTime: 20,
			createdBy: "user-1",
			createdByName: "ユーザー1",
			isPublic: true,
			playCount: 5,
			likeCount: 2,
			dislikeCount: 0,
			favoriteCount: 1,
			createdAt: "2023-01-01T00:00:00Z",
			updatedAt: "2023-01-01T00:00:00Z",
			_computed: {
				isPopular: false,
				engagementRate: 0.4,
				engagementRatePercentage: 40,
				popularityScore: 9,
				searchableText: "テスト音声ボタン1 テスト テスト動画1 ユーザー1",
				durationText: "10秒",
				relativeTimeText: "1日前",
			},
		},
		{
			id: "audio-2",
			title: "テスト音声ボタン2",
			description: "テスト用の音声ボタン2",
			tags: ["音楽"],
			sourceVideoId: "video-2",
			sourceVideoTitle: "テスト動画2",
			sourceVideoThumbnailUrl: "https://img.youtube.com/vi/video-2/maxresdefault.jpg",
			startTime: 30,
			endTime: 45,
			createdBy: "user-2",
			createdByName: "ユーザー2",
			isPublic: true,
			playCount: 8,
			likeCount: 3,
			dislikeCount: 0,
			favoriteCount: 0,
			createdAt: "2023-01-02T00:00:00Z",
			updatedAt: "2023-01-02T00:00:00Z",
			_computed: {
				isPopular: false,
				engagementRate: 0.375,
				engagementRatePercentage: 38,
				popularityScore: 14,
				searchableText: "テスト音声ボタン2 音楽 テスト動画2 ユーザー2",
				durationText: "15秒",
				relativeTimeText: "2日前",
			},
		},
	];

	it("音声ボタンが正しく表示される", () => {
		render(<FeaturedAudioButtonsCarousel audioButtons={mockAudioButtons} />);

		// すべての音声ボタンが表示されることを確認
		const audioButtonTitles = screen.getAllByTestId("audio-button-title");
		expect(audioButtonTitles).toHaveLength(2);
		expect(audioButtonTitles[0]).toHaveTextContent("テスト音声ボタン1");
		expect(audioButtonTitles[1]).toHaveTextContent("テスト音声ボタン2");

		// 音声ボタンIDが正しく設定されることを確認
		const audioButtonIds = screen.getAllByTestId("audio-button-id");
		expect(audioButtonIds[0]).toHaveTextContent("audio-1");
		expect(audioButtonIds[1]).toHaveTextContent("audio-2");
	});

	it("flex-wrapレイアウトで音声ボタンが配置される", () => {
		render(<FeaturedAudioButtonsCarousel audioButtons={mockAudioButtons} />);

		// flex-wrapコンテナが存在することを確認
		const buttons = screen.getAllByTestId("audio-button-with-favorite");
		const container = buttons[0].parentElement;
		expect(container).toHaveClass(
			"flex",
			"flex-wrap",
			"gap-2",
			"sm:gap-3",
			"items-start",
			"justify-center",
		);
	});

	it("音声ボタンが空の場合にローディング状態を表示する", () => {
		render(
			<SessionProvider session={null}>
				<FeaturedAudioButtonsCarousel audioButtons={[]} />
			</SessionProvider>,
		);

		expect(screen.getByText(UI_MESSAGES.LOADING.GENERAL)).toBeInTheDocument();
		expect(screen.queryByTestId("audio-button-with-favorite")).not.toBeInTheDocument();
	});

	it("単一の音声ボタンも正しく表示される", () => {
		const singleAudioButton = [mockAudioButtons[0]];
		render(
			<SessionProvider session={null}>
				<FeaturedAudioButtonsCarousel audioButtons={singleAudioButton} />
			</SessionProvider>,
		);

		expect(screen.getByTestId("audio-button-with-favorite")).toBeInTheDocument();
		expect(screen.getByTestId("audio-button-title")).toHaveTextContent("テスト音声ボタン1");
		expect(screen.getByTestId("audio-button-id")).toHaveTextContent("audio-1");
	});

	it("各音声ボタンがインライン要素として配置される", () => {
		render(<FeaturedAudioButtonsCarousel audioButtons={mockAudioButtons} />);

		const audioButtons = screen.getAllByTestId("audio-button-with-favorite");
		expect(audioButtons).toHaveLength(2);

		// 各音声ボタンが正しいタイトルとIDを持つことを確認
		audioButtons.forEach((button, index) => {
			const audioButton = mockAudioButtons[index];
			expect(button).toHaveTextContent(audioButton.title);
			expect(button).toHaveTextContent(audioButton.id);
		});
	});
});
