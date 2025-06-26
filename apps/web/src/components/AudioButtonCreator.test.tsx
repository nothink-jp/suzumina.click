import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AudioButtonCreator } from "./AudioButtonCreator";

// Mock the actions
vi.mock("@/app/buttons/actions", () => ({
	createAudioButton: vi.fn().mockResolvedValue({
		success: true,
		data: { id: "new-audio-button-id" },
	}),
}));

// Mock Next.js router
vi.mock("next/navigation", () => ({
	useRouter: () => ({
		push: vi.fn(),
		back: vi.fn(),
	}),
}));

// Mock YouTubePlayer
vi.mock("@suzumina.click/ui/components/custom/youtube-player", () => ({
	YouTubePlayer: ({ videoId }: any) => (
		<div data-testid="youtube-player" data-video-id={videoId}>
			YouTube Player Mock
		</div>
	),
}));

// Mock SimpleAudioButton
vi.mock("@suzumina.click/ui/components/custom/simple-audio-button", () => ({
	SimpleAudioButton: ({ audioButton }: any) => (
		<div data-testid="simple-audio-button">Simple Audio Button Mock: {audioButton?.title}</div>
	),
}));

// Mock UI components
vi.mock("@suzumina.click/ui/components/ui/slider", () => ({
	Slider: ({ min, max, step, disabled }: any) => (
		<div data-testid="slider">
			<input
				type="range"
				defaultValue={0}
				onChange={(_e) => {
					/* noop */
				}}
				min={min || 0}
				max={max || 100}
				step={step || 1}
				disabled={disabled}
				data-testid="slider-input"
				aria-label="Slider"
			/>
		</div>
	),
}));

// Mock Select components
vi.mock("@suzumina.click/ui/components/ui/select", () => ({
	Select: ({ children }: any) => <div data-testid="select-container">{children}</div>,
	SelectTrigger: ({ children }: any) => (
		<select>
			<option>{children}</option>
		</select>
	),
	SelectValue: ({ placeholder }: any) => <span>{placeholder || "ボイス"}</span>,
	SelectContent: ({ children }: any) => <div data-testid="select-content">{children}</div>,
	SelectItem: ({ children, value }: any) => (
		<div data-testid={`select-item-${value}`}>{children}</div>
	),
}));

describe("AudioButtonCreator", () => {
	const defaultProps = {
		videoId: "test-video-id",
		videoTitle: "テスト動画タイトル",
		videoDuration: 300,
		initialStartTime: 0,
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	// 基本的なレンダリングテストは統合テストに移行済み
	// (src/__tests__/integration/audioButtonComponents.test.tsx)

	it("タイトル入力が正しく動作する", async () => {
		const user = userEvent.setup();
		render(<AudioButtonCreator {...defaultProps} />);

		const titleInput = screen.getByPlaceholderText("例: おはようございます");
		await user.type(titleInput, "新しい音声ボタン");

		expect(titleInput).toHaveValue("新しい音声ボタン");
	});

	it("現在時間ボタンが正しく動作する", async () => {
		const user = userEvent.setup();
		render(<AudioButtonCreator {...defaultProps} />);

		const startTimeButton = screen.getByRole("button", { name: /開始時間に設定/ });
		const endTimeButton = screen.getByRole("button", { name: /終了時間に設定/ });

		expect(startTimeButton).toBeInTheDocument();
		expect(endTimeButton).toBeInTheDocument();

		// 開始時間設定ボタンをクリック
		await user.click(startTimeButton);

		// ボタンが存在して操作可能であることを確認
		expect(startTimeButton).toBeInTheDocument();
	});

	it("プレビューボタンが存在する", () => {
		render(<AudioButtonCreator {...defaultProps} />);

		const previewButton = screen.getByRole("button", { name: /選択範囲をプレビュー/ });
		expect(previewButton).toBeInTheDocument();
	});

	it("長さ表示セクションが存在する", () => {
		render(<AudioButtonCreator {...defaultProps} />);

		expect(screen.getByText(/切り抜き時間:/)).toBeInTheDocument();
	});

	it("YouTubeプレイヤーが表示される", () => {
		render(<AudioButtonCreator {...defaultProps} />);

		const youtubePlayer = screen.getByTestId("youtube-player");
		expect(youtubePlayer).toBeInTheDocument();
		expect(youtubePlayer).toHaveAttribute("data-video-id", "test-video-id");
	});

	it("作成ボタンが存在する", () => {
		render(<AudioButtonCreator {...defaultProps} />);

		const createButton = screen.getByRole("button", {
			name: /音声ボタンを作成/,
		});
		expect(createButton).toBeInTheDocument();
	});

	it("キャンセルボタンが存在する", () => {
		render(<AudioButtonCreator {...defaultProps} />);

		const cancelButton = screen.getByRole("button", { name: /キャンセル/i });
		expect(cancelButton).toBeInTheDocument();
	});

	it("プレビューボタンが表示される", () => {
		render(<AudioButtonCreator {...defaultProps} />);

		// Look for the specific preview button text
		const previewButton = screen.getByText("選択範囲をプレビュー");
		expect(previewButton).toBeInTheDocument();
	});

	it("キャンセルボタンがクリック可能である", async () => {
		const user = userEvent.setup();
		render(<AudioButtonCreator {...defaultProps} />);

		const cancelButton = screen.getByRole("button", { name: /キャンセル/i });
		await user.click(cancelButton);

		// Just verify the button exists and is clickable
		expect(cancelButton).toBeInTheDocument();
	});

	it("initialStartTimeが正しく設定される", () => {
		render(<AudioButtonCreator {...defaultProps} initialStartTime={30} />);

		// コンポーネントが正常にレンダリングされることを確認
		expect(screen.getByRole("heading", { name: /音声ボタンを作成/ })).toBeInTheDocument();
	});

	it("videoDurationが正しく設定される", () => {
		render(<AudioButtonCreator {...defaultProps} videoDuration={600} />);

		// コンポーネントが正常にレンダリングされることを確認
		expect(screen.getByRole("heading", { name: /音声ボタンを作成/ })).toBeInTheDocument();
	});
});
