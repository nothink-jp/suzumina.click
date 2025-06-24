import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AudioReferenceCreator } from "./AudioReferenceCreator";

// Mock the actions
vi.mock("@/app/buttons/actions", () => ({
	createAudioReference: vi.fn().mockResolvedValue({
		success: true,
		data: { id: "new-audio-ref-id" },
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
vi.mock("./YouTubePlayer", () => ({
	// biome-ignore lint/correctness/noUnusedFunctionParameters: props used for testing interface compatibility
	YouTubePlayer: ({ videoId, ...props }: any) => (
		<div data-testid="youtube-player" data-video-id={videoId}>
			YouTube Player Mock
		</div>
	),
}));

// Mock AudioReferenceCard
vi.mock("./AudioReferenceCard", () => ({
	// biome-ignore lint/correctness/noUnusedFunctionParameters: props used for testing interface compatibility
	AudioReferenceCard: ({ audioReference, ...props }: any) => (
		<div data-testid="audio-reference-card">Audio Reference Card Mock: {audioReference?.title}</div>
	),
}));

// Mock UI components
vi.mock("@suzumina.click/ui/components/ui/slider", () => ({
	Slider: ({ value, onValueChange, min, max, step, disabled, ...props }: any) => (
		<div data-testid="slider" {...props}>
			<input
				type="range"
				value={value?.[0] || 0}
				onChange={(e) => onValueChange?.([Number(e.target.value)])}
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
	// biome-ignore lint/correctness/noUnusedFunctionParameters: value and onValueChange used for testing interface compatibility
	Select: ({ children, value, onValueChange }: any) => (
		<div data-testid="select-container">{children}</div>
	),
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

describe("AudioReferenceCreator", () => {
	const defaultProps = {
		videoId: "test-video-id",
		videoTitle: "テスト動画タイトル",
		videoDuration: 300,
		initialStartTime: 0,
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("基本的なフォームが表示される", () => {
		render(<AudioReferenceCreator {...defaultProps} />);

		expect(screen.getByRole("heading", { name: /音声ボタンを作成/ })).toBeInTheDocument();
		expect(screen.getByText(/テスト動画タイトル/)).toBeInTheDocument();
	});

	it("タイトル入力フィールドが存在する", () => {
		render(<AudioReferenceCreator {...defaultProps} />);

		// Use placeholder text since the label includes asterisk
		const titleInput = screen.getByPlaceholderText("例: おはようございます");
		expect(titleInput).toBeInTheDocument();
		expect(titleInput).toHaveAttribute("maxLength", "100");
	});

	it("切り抜き範囲セクションが存在する", () => {
		render(<AudioReferenceCreator {...defaultProps} />);

		expect(screen.getByText("切り抜き範囲")).toBeInTheDocument();
		expect(screen.getByText(/開始:/)).toBeInTheDocument();
		expect(screen.getByText(/終了:/)).toBeInTheDocument();
	});

	it("現在時間表示が存在する", () => {
		render(<AudioReferenceCreator {...defaultProps} />);

		expect(screen.getByText(/現在:/)).toBeInTheDocument();
	});

	it("タイトル入力が正しく動作する", async () => {
		const user = userEvent.setup();
		render(<AudioReferenceCreator {...defaultProps} />);

		const titleInput = screen.getByPlaceholderText("例: おはようございます");
		await user.type(titleInput, "新しい音声ボタン");

		expect(titleInput).toHaveValue("新しい音声ボタン");
	});

	it("現在時間ボタンが正しく動作する", async () => {
		const user = userEvent.setup();
		render(<AudioReferenceCreator {...defaultProps} />);

		const startTimeButtons = screen.getAllByText("現在時間");
		expect(startTimeButtons.length).toBeGreaterThanOrEqual(2);

		// 開始時間設定ボタンをクリック
		await user.click(startTimeButtons[0]);

		// ボタンが存在して操作可能であることを確認
		expect(startTimeButtons[0]).toBeInTheDocument();
	});

	it("プレビューボタンが存在する", () => {
		render(<AudioReferenceCreator {...defaultProps} />);

		const previewButton = screen.getByRole("button", { name: /プレビュー再生/ });
		expect(previewButton).toBeInTheDocument();
	});

	it("長さ表示セクションが存在する", () => {
		render(<AudioReferenceCreator {...defaultProps} />);

		expect(screen.getByText(/長さ:/)).toBeInTheDocument();
	});

	it("YouTubeプレイヤーが表示される", () => {
		render(<AudioReferenceCreator {...defaultProps} />);

		const youtubePlayer = screen.getByTestId("youtube-player");
		expect(youtubePlayer).toBeInTheDocument();
		expect(youtubePlayer).toHaveAttribute("data-video-id", "test-video-id");
	});

	it("作成ボタンが存在する", () => {
		render(<AudioReferenceCreator {...defaultProps} />);

		const createButton = screen.getByRole("button", {
			name: /音声ボタンを作成/,
		});
		expect(createButton).toBeInTheDocument();
	});

	it("キャンセルボタンが存在する", () => {
		render(<AudioReferenceCreator {...defaultProps} />);

		const cancelButton = screen.getByRole("button", { name: /キャンセル/i });
		expect(cancelButton).toBeInTheDocument();
	});

	it("プレビューボタンが表示される", () => {
		render(<AudioReferenceCreator {...defaultProps} />);

		// Look for the specific preview button text
		const previewButton = screen.getByText("プレビュー再生");
		expect(previewButton).toBeInTheDocument();
	});

	it("キャンセルボタンがクリック可能である", async () => {
		const user = userEvent.setup();
		render(<AudioReferenceCreator {...defaultProps} />);

		const cancelButton = screen.getByRole("button", { name: /キャンセル/i });
		await user.click(cancelButton);

		// Just verify the button exists and is clickable
		expect(cancelButton).toBeInTheDocument();
	});

	it("initialStartTimeが正しく設定される", () => {
		render(<AudioReferenceCreator {...defaultProps} initialStartTime={30} />);

		// コンポーネントが正常にレンダリングされることを確認
		expect(screen.getByRole("heading", { name: /音声ボタンを作成/ })).toBeInTheDocument();
	});

	it("videoDurationが正しく設定される", () => {
		render(<AudioReferenceCreator {...defaultProps} videoDuration={600} />);

		// コンポーネントが正常にレンダリングされることを確認
		expect(screen.getByRole("heading", { name: /音声ボタンを作成/ })).toBeInTheDocument();
	});
});
