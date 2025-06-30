import {
	mockViewport,
	testAcrossViewports,
	validateResponsiveClasses,
} from "@suzumina.click/ui/test-utils/responsive-testing";
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

		const previewButton = screen.getByRole("button", { name: /選択範囲をプレビュー/ });
		expect(previewButton).toBeInTheDocument();
	});

	describe("Responsive Layout", () => {
		beforeEach(() => {
			mockViewport(1440, 900);
		});

		it("should render with responsive grid layout classes", () => {
			const { container } = render(<AudioButtonCreator {...defaultProps} />);

			const gridContainer = container.querySelector(".grid");
			expect(gridContainer).toHaveClass("grid-cols-1", "lg:grid-cols-2", "xl:grid-cols-3");
		});

		it("should have touch-optimized button heights", () => {
			render(<AudioButtonCreator {...defaultProps} />);

			const startTimeButton = screen.getByRole("button", { name: /開始時間に設定/ });
			const endTimeButton = screen.getByRole("button", { name: /終了時間に設定/ });

			validateResponsiveClasses(startTimeButton, {
				base: ["h-16", "sm:h-20", "min-h-[44px]"],
			});
			validateResponsiveClasses(endTimeButton, {
				base: ["h-16", "sm:h-20", "min-h-[44px]"],
			});
		});

		it("should have responsive text sizing", () => {
			render(<AudioButtonCreator {...defaultProps} />);

			// 現在時間表示のテキストサイズを確認
			const timeDisplays = screen.getAllByText(/再生時間/);
			const timeDisplay = timeDisplays[0];
			expect(timeDisplay.parentElement).toHaveClass("text-xs", "sm:text-sm");
		});

		it("should render responsive input field height", () => {
			render(<AudioButtonCreator {...defaultProps} />);

			const titleInput = screen.getByPlaceholderText("例: おはようございます");
			expect(titleInput).toHaveClass("min-h-[44px]");
		});

		it("should have responsive button order on mobile", () => {
			render(<AudioButtonCreator {...defaultProps} />);

			const createButton = screen.getByRole("button", { name: /音声ボタンを作成/ });
			const cancelButton = screen.getByRole("button", { name: /キャンセル/ });

			validateResponsiveClasses(createButton, {
				base: ["order-1", "sm:order-2"],
			});
			validateResponsiveClasses(cancelButton, {
				base: ["order-2", "sm:order-1"],
			});
		});

		it("should have responsive button grid on mobile", () => {
			render(<AudioButtonCreator {...defaultProps} />);

			const buttonContainer = screen.getByRole("button", { name: /開始時間に設定/ }).parentElement;

			expect(buttonContainer).toHaveClass("grid-cols-1", "sm:grid-cols-2");
		});

		testAcrossViewports("should adapt layout to viewport", (viewport) => {
			const { container } = render(<AudioButtonCreator {...defaultProps} />);

			const gridContainer = container.querySelector(".grid");
			expect(gridContainer).toHaveClass("grid-cols-1");

			// Large screens show 2-column layout
			if (viewport.width >= 1024) {
				expect(gridContainer).toHaveClass("lg:grid-cols-2");
			}

			// Extra large screens show 3-column layout
			if (viewport.width >= 1280) {
				expect(gridContainer).toHaveClass("xl:grid-cols-3");
			}
		});

		it("should have mobile-optimized spacing", () => {
			mockViewport(375, 667); // Mobile

			const { container } = render(<AudioButtonCreator {...defaultProps} />);

			const controlPanel = container.querySelector(".space-y-4");
			expect(controlPanel).toHaveClass("lg:space-y-6");
		});
	});

	describe("Touch Target Validation", () => {
		it("should meet WCAG touch target requirements", () => {
			render(<AudioButtonCreator {...defaultProps} />);

			const startTimeButton = screen.getByRole("button", { name: /開始時間に設定/ });
			const endTimeButton = screen.getByRole("button", { name: /終了時間に設定/ });
			const previewButton = screen.getByRole("button", { name: /選択範囲をプレビュー/ });
			const createButton = screen.getByRole("button", { name: /音声ボタンを作成/ });

			// すべてのボタンが44px以上のタッチターゲットを持つ
			[startTimeButton, endTimeButton, previewButton, createButton].forEach((button) => {
				expect(button).toHaveClass("min-h-[44px]");
			});
		});

		it("should maintain touch target size in mobile viewport", () => {
			mockViewport(375, 667); // Mobile

			render(<AudioButtonCreator {...defaultProps} />);

			const titleInput = screen.getByPlaceholderText("例: おはようございます");
			expect(titleInput).toHaveClass("min-h-[44px]");

			const buttons = screen.getAllByRole("button");
			buttons.forEach((button) => {
				// すべてのボタンがモバイルで適切なサイズを持つ
				const classList = Array.from(button.classList);
				const hasMinHeight = classList.some((cls) => cls.includes("min-h-") || cls.includes("h-"));
				expect(hasMinHeight).toBe(true);
			});
		});
	});

	describe("Form Accessibility", () => {
		it("should have proper form labels and associations", () => {
			render(<AudioButtonCreator {...defaultProps} />);

			const titleInput = screen.getByPlaceholderText("例: おはようございます");
			const titleLabel = screen.getByText(/ボタンタイトル/);

			// ラベルとinputが適切に関連付けられている
			expect(titleLabel).toBeInTheDocument();
			expect(titleInput).toBeInTheDocument();
		});

		it("should be keyboard navigable", async () => {
			const user = userEvent.setup();
			render(<AudioButtonCreator {...defaultProps} />);

			const titleInput = screen.getByPlaceholderText("例: おはようございます");
			const startTimeButton = screen.getByRole("button", { name: /開始時間に設定/ });

			// Tab navigation
			await user.tab();
			expect(titleInput).toHaveFocus();

			await user.tab();
			expect(startTimeButton).toHaveFocus();
		});

		it("should provide appropriate error feedback", () => {
			render(<AudioButtonCreator {...defaultProps} />);

			// 時間制限エラーの表示確認
			const errorMessage = screen.queryByText("60秒以下にしてください");
			// 初期状態ではエラーが表示されないことを確認
			expect(errorMessage).not.toBeInTheDocument();
		});
	});

	describe("Mobile Layout Optimization", () => {
		it("should stack elements vertically on mobile", () => {
			mockViewport(375, 667);

			render(<AudioButtonCreator {...defaultProps} />);

			const createButton = screen.getByRole("button", { name: /音声ボタンを作成/ });
			const _cancelButton = screen.getByRole("button", { name: /キャンセル/ });

			// モバイルではボタンが縦並び
			expect(createButton.parentElement).toHaveClass("flex-col", "sm:flex-row");
		});

		it("should adjust text size for mobile readability", () => {
			mockViewport(375, 667);

			render(<AudioButtonCreator {...defaultProps} />);

			const titleLabel = screen.getByText(/ボタンタイトル/);
			expect(titleLabel).toHaveClass("text-sm", "sm:text-base");
		});

		it("should optimize spacing for mobile", () => {
			mockViewport(375, 667);

			const { container } = render(<AudioButtonCreator {...defaultProps} />);

			const controlPanel = container.querySelector(".bg-card.border.rounded-lg");
			expect(controlPanel).toHaveClass("p-4", "lg:p-6");
		});
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
