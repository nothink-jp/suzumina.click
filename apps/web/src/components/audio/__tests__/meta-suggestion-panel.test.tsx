import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGenerate = vi.fn();
vi.mock("@/actions/audio-button-suggestions", () => ({
	generateAudioButtonSuggestions: (input: unknown) => mockGenerate(input),
}));

const mockTrackSuggestionGenerate = vi.fn();
const mockTrackSuggestionApply = vi.fn();
vi.mock("@/lib/analytics/events", () => ({
	trackSuggestionGenerate: (input: unknown) => mockTrackSuggestionGenerate(input),
	trackSuggestionApply: (videoId: string, target: string) =>
		mockTrackSuggestionApply(videoId, target),
}));

const { MetaSuggestionPanel } = await import("../meta-suggestion-panel");

const SUGGESTION = {
	transcript: "やべ、いるわ",
	titles: ["やべ、いるわ", "即死に笑う"],
	tags: ["ゲーム", "バイオハザード5"],
};

function renderPanel(overrides: Partial<Parameters<typeof MetaSuggestionPanel>[0]> = {}) {
	const onSelectTitle = vi.fn();
	const onAddTag = vi.fn();
	render(
		<MetaSuggestionPanel
			videoId="S534eutWhUY"
			startTime={411.3}
			endTime={414.7}
			currentTags={[]}
			onSelectTitle={onSelectTitle}
			onAddTag={onAddTag}
			{...overrides}
		/>,
	);
	return { onSelectTitle, onAddTag };
}

describe("MetaSuggestionPanel (SPR-148)", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGenerate.mockResolvedValue({ success: true, data: SUGGESTION });
	});

	it("生成ボタンで選択区間を渡して候補を取得し、タイトル・タグ候補を表示する", async () => {
		renderPanel();

		fireEvent.click(screen.getByRole("button", { name: "選択区間から生成" }));

		await waitFor(() => {
			expect(screen.getByText("やべ、いるわ")).toBeInTheDocument();
		});
		expect(mockGenerate).toHaveBeenCalledWith({
			videoId: "S534eutWhUY",
			startTime: 411.3,
			endTime: 414.7,
		});
		expect(screen.getByText(/聞き取り:/)).toBeInTheDocument();
		expect(screen.getByText("ゲーム")).toBeInTheDocument();
		// 取得後は再生成ボタンに変わる
		expect(screen.getByRole("button", { name: "再生成" })).toBeInTheDocument();
		expect(mockTrackSuggestionGenerate).toHaveBeenCalledWith({
			videoId: "S534eutWhUY",
			success: true,
		});
	});

	it("タイトル候補クリックで onSelectTitle、タグ候補クリックで onAddTag が呼ばれ、それぞれ計器化される", async () => {
		const { onSelectTitle, onAddTag } = renderPanel();

		fireEvent.click(screen.getByRole("button", { name: "選択区間から生成" }));
		await waitFor(() => {
			expect(screen.getByText("やべ、いるわ")).toBeInTheDocument();
		});

		fireEvent.click(screen.getByRole("button", { name: "やべ、いるわ" }));
		expect(onSelectTitle).toHaveBeenCalledWith("やべ、いるわ");
		expect(mockTrackSuggestionApply).toHaveBeenCalledWith("S534eutWhUY", "title");

		fireEvent.click(screen.getByRole("button", { name: "ゲーム" }));
		expect(onAddTag).toHaveBeenCalledWith("ゲーム");
		expect(mockTrackSuggestionApply).toHaveBeenCalledWith("S534eutWhUY", "tag");
	});

	it("追加済みタグの候補は無効化される", async () => {
		renderPanel({ currentTags: ["ゲーム"] });

		fireEvent.click(screen.getByRole("button", { name: "選択区間から生成" }));
		await waitFor(() => {
			expect(screen.getByRole("button", { name: "ゲーム" })).toBeDisabled();
		});
	});

	it("生成失敗はエラー表示のみで手入力を妨げない（フォームは親側で継続）", async () => {
		mockGenerate.mockResolvedValue({ success: false, error: "ログインが必要です" });
		renderPanel();

		fireEvent.click(screen.getByRole("button", { name: "選択区間から生成" }));

		await waitFor(() => {
			expect(screen.getByText("ログインが必要です")).toBeInTheDocument();
		});
		// 失敗後も再試行できる
		expect(screen.getByRole("button", { name: "選択区間から生成" })).toBeEnabled();
		expect(mockTrackSuggestionGenerate).toHaveBeenCalledWith({
			videoId: "S534eutWhUY",
			success: false,
			reason: "ログインが必要です",
		});
	});

	it("disabled中は生成ボタンが押せない", () => {
		renderPanel({ disabled: true });
		expect(screen.getByRole("button", { name: "選択区間から生成" })).toBeDisabled();
	});
});
