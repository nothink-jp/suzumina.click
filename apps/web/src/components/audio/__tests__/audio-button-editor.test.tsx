import "@testing-library/jest-dom";
import type { AudioButtonPlainObject } from "@suzumina.click/shared-types";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AudioButtonEditor } from "../audio-button-editor";

const mockUpdateAudioButton = vi.fn();
vi.mock("@/app/buttons/actions", () => ({
	updateAudioButton: (id: string, input: unknown) => mockUpdateAudioButton(id, input),
}));

vi.mock("next/navigation", () => ({
	useRouter: () => ({ back: vi.fn() }),
}));

const mockPlayHero = vi.fn();
vi.mock("@suzumina.click/ui/components/custom/play-hero", () => ({
	PlayHero: (props: { onPlay?: () => void; audioButton: { buttonText: string } }) => {
		mockPlayHero(props);
		return <div data-testid="play-hero" />;
	},
}));

vi.mock("../audio-button-tag-editor", () => ({
	AudioButtonTagEditor: ({ tags }: { tags: string[] }) => (
		<div data-testid="tag-editor">{tags.join(",")}</div>
	),
}));

const audioButton: AudioButtonPlainObject = {
	id: "button-1",
	buttonText: "おはよう",
	tags: ["挨拶"],
	videoId: "video-1",
	videoTitle: "朝の配信",
	startTime: 65,
	endTime: 68.5,
	duration: 3.5,
	creatorId: "user-1",
	creatorName: "User 1",
	isPublic: true,
	stats: { playCount: 0, likeCount: 0, dislikeCount: 0, favoriteCount: 0, engagementRate: 0 },
	createdAt: "2026-01-01T00:00:00.000Z",
	updatedAt: "2026-01-01T00:00:00.000Z",
	_computed: {
		isPopular: false,
		engagementRate: 0,
		engagementRatePercentage: 0,
		popularityScore: 0,
		searchableText: "",
		durationText: "3秒",
		relativeTimeText: "",
	},
};

describe("AudioButtonEditor", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockUpdateAudioButton.mockResolvedValue({ success: true });
	});

	it("切り抜き範囲は表示のみで、調整 UI を持たない", () => {
		render(<AudioButtonEditor audioButton={audioButton} />);

		expect(screen.getByText(/1:05\.0 〜\s*1:08\.5（3\.5秒）/)).toBeInTheDocument();
		expect(screen.getByText("切り抜き範囲は作成後に変更できません")).toBeInTheDocument();
		expect(screen.queryByText("開始時間に設定")).not.toBeInTheDocument();
		expect(screen.queryByText("終了時間に設定")).not.toBeInTheDocument();
	});

	it("確認用の再生は再生数に数えない（onPlay を渡さない）", () => {
		render(<AudioButtonEditor audioButton={audioButton} />);

		expect(screen.getByTestId("play-hero")).toBeInTheDocument();
		expect(mockPlayHero.mock.calls[0]?.[0].onPlay).toBeUndefined();
	});

	it("再生ボタンの見出しは入力中のタイトルを映し、空欄なら保存済みのタイトルに戻る", async () => {
		const user = userEvent.setup();
		render(<AudioButtonEditor audioButton={audioButton} />);
		const titleInput = screen.getByPlaceholderText("例: おはようございます");
		const lastTitle = () => mockPlayHero.mock.calls.at(-1)?.[0].audioButton.buttonText;

		await user.clear(titleInput);
		expect(lastTitle()).toBe("おはよう");

		await user.type(titleInput, "こんばんは");
		expect(lastTitle()).toBe("こんばんは");
	});

	it("変更が無いと保存できない", () => {
		render(<AudioButtonEditor audioButton={audioButton} />);

		expect(screen.getByRole("button", { name: /変更を保存/ })).toBeDisabled();
		expect(screen.getByText("変更がありません")).toBeInTheDocument();
	});

	it("空のタイトルでは保存できない", async () => {
		const user = userEvent.setup();
		render(<AudioButtonEditor audioButton={audioButton} />);

		await user.clear(screen.getByPlaceholderText("例: おはようございます"));

		expect(screen.getByRole("button", { name: /変更を保存/ })).toBeDisabled();
	});

	it("保存はタイトルとタグだけを送る（範囲は送らない）", async () => {
		const user = userEvent.setup();
		render(<AudioButtonEditor audioButton={audioButton} />);

		const titleInput = screen.getByPlaceholderText("例: おはようございます");
		await user.clear(titleInput);
		await user.type(titleInput, "おはようございます");
		await user.click(screen.getByRole("button", { name: /変更を保存/ }));

		await waitFor(() => {
			expect(mockUpdateAudioButton).toHaveBeenCalledWith("button-1", {
				buttonText: "おはようございます",
				tags: ["挨拶"],
			});
		});
	});

	it("保存に失敗したらエラーを表示する", async () => {
		mockUpdateAudioButton.mockResolvedValue({ success: false, error: "更新権限がありません" });
		const user = userEvent.setup();
		render(<AudioButtonEditor audioButton={audioButton} />);

		await user.type(screen.getByPlaceholderText("例: おはようございます"), "!");
		await user.click(screen.getByRole("button", { name: /変更を保存/ }));

		expect(await screen.findByText("更新権限がありません")).toBeInTheDocument();
	});
});
