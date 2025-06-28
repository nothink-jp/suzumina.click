import type { FrontendAudioButtonData } from "@suzumina.click/shared-types";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FeaturedAudioButtonsCarousel } from "./FeaturedAudioButtonsCarousel";

// SimpleAudioButton のモック
vi.mock("@suzumina.click/ui/components/custom/simple-audio-button", () => ({
	SimpleAudioButton: ({ audioButton }: { audioButton: FrontendAudioButtonData }) => (
		<div data-testid="simple-audio-button">
			<span data-testid="audio-button-title">{audioButton.title}</span>
			<span data-testid="audio-button-id">{audioButton.id}</span>
		</div>
	),
}));

// Carousel コンポーネントのモックは不要になったため削除

describe("FeaturedAudioButtonsCarousel", () => {
	const mockAudioButtons: FrontendAudioButtonData[] = [
		{
			id: "audio-1",
			title: "テスト音声ボタン1",
			description: "テスト用の音声ボタン",
			category: "voice",
			tags: ["テスト"],
			sourceVideoId: "video-1",
			sourceVideoTitle: "テスト動画1",
			sourceVideoThumbnailUrl: "https://img.youtube.com/vi/video-1/maxresdefault.jpg",
			startTime: 10,
			endTime: 20,
			uploadedBy: "user-1",
			uploadedByName: "ユーザー1",
			isPublic: true,
			playCount: 5,
			likeCount: 2,
			createdAt: "2023-01-01T00:00:00Z",
			updatedAt: "2023-01-01T00:00:00Z",
			durationText: "10秒",
			relativeTimeText: "1日前",
		},
		{
			id: "audio-2",
			title: "テスト音声ボタン2",
			description: "テスト用の音声ボタン2",
			category: "bgm",
			tags: ["音楽"],
			sourceVideoId: "video-2",
			sourceVideoTitle: "テスト動画2",
			sourceVideoThumbnailUrl: "https://img.youtube.com/vi/video-2/maxresdefault.jpg",
			startTime: 30,
			endTime: 45,
			uploadedBy: "user-2",
			uploadedByName: "ユーザー2",
			isPublic: true,
			playCount: 8,
			likeCount: 3,
			createdAt: "2023-01-02T00:00:00Z",
			updatedAt: "2023-01-02T00:00:00Z",
			durationText: "15秒",
			relativeTimeText: "2日前",
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
		const buttons = screen.getAllByTestId("simple-audio-button");
		const container = buttons[0].parentElement;
		expect(container).toHaveClass("flex", "flex-wrap", "gap-3", "items-start");
	});

	it("音声ボタンが空の場合にローディング状態を表示する", () => {
		render(<FeaturedAudioButtonsCarousel audioButtons={[]} />);

		expect(screen.getByText("新着音声ボタンを読み込み中...")).toBeInTheDocument();
		expect(screen.queryByTestId("simple-audio-button")).not.toBeInTheDocument();
	});

	it("単一の音声ボタンも正しく表示される", () => {
		const singleAudioButton = [mockAudioButtons[0]];
		render(<FeaturedAudioButtonsCarousel audioButtons={singleAudioButton} />);

		expect(screen.getByTestId("simple-audio-button")).toBeInTheDocument();
		expect(screen.getByTestId("audio-button-title")).toHaveTextContent("テスト音声ボタン1");
		expect(screen.getByTestId("audio-button-id")).toHaveTextContent("audio-1");
	});

	it("各音声ボタンがインライン要素として配置される", () => {
		render(<FeaturedAudioButtonsCarousel audioButtons={mockAudioButtons} />);

		const audioButtons = screen.getAllByTestId("simple-audio-button");
		expect(audioButtons).toHaveLength(2);

		// 各音声ボタンが正しいタイトルとIDを持つことを確認
		audioButtons.forEach((button, index) => {
			const audioButton = mockAudioButtons[index];
			expect(button).toHaveTextContent(audioButton.title);
			expect(button).toHaveTextContent(audioButton.id);
		});
	});
});
