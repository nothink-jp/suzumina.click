import type { AudioButtonDraft, VideoPlainObject } from "@suzumina.click/shared-types";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CaptureView } from "../capture-view";

const mockUpdatePlayerTime = vi.fn();
vi.mock("@/actions/button-drafts", () => ({
	createButtonDraft: vi.fn().mockResolvedValue({ success: true, data: {} }),
	deleteButtonDraft: vi.fn().mockResolvedValue({ success: true }),
	updateButtonDraftPlayerTime: (...args: unknown[]) => mockUpdatePlayerTime(...args),
}));

vi.mock("@/lib/analytics/events", () => ({
	trackMarkDraft: vi.fn(),
}));

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: mockPush }),
}));

vi.mock("@suzumina.click/ui/components/custom/youtube-player", () => ({
	YouTubePlayer: ({ videoId }: { videoId: string }) => (
		<div data-testid="youtube-player" data-video-id={videoId} />
	),
}));

function makeDraft(
	id: string,
	videoId: string,
	videoTitle: string,
	suggestedStartTime: number,
	createdAt: string,
): AudioButtonDraft {
	return {
		id,
		videoId,
		videoTitle,
		playerTime: suggestedStartTime + 15,
		markedAt: createdAt,
		createdAt,
		suggestedStartTime,
	};
}

function makeVideo(videoId: string, videoType: string, embeddable = true): VideoPlainObject {
	return {
		videoId,
		title: `動画 ${videoId}`,
		status: { embeddable },
		_computed: { videoType },
	} as unknown as VideoPlainObject;
}

describe("CaptureView の今回のマーク（導線再設計 段2: 表示中の動画の下書きだけを置く）", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("表示中の動画の下書きに件数と「まとめて仕上げる」が表示される", () => {
		const drafts = [
			makeDraft("a2", "video-curr111", "表示中の動画", 300, "2026-07-15T12:10:00.000Z"),
			makeDraft("a1", "video-curr111", "表示中の動画", 100, "2026-07-15T12:05:00.000Z"),
		];
		render(
			<CaptureView
				video={makeVideo("video-curr111", "archived")}
				initialDrafts={drafts}
				otherDraftsSummary={null}
			/>,
		);

		expect(screen.getByText("今回のマーク")).toBeInTheDocument();
		expect(screen.getByText("2件の下書き")).toBeInTheDocument();
		// まとめて仕上げる = グループ先頭（推奨開始秒が最小）の下書きから開く
		const bulkLink = screen.getByRole("link", { name: /まとめて仕上げる/ });
		expect(bulkLink).toHaveAttribute(
			"href",
			"/buttons/create?video_id=video-curr111&start_time=100&draft_id=a1",
		);
	});

	it("配信中はまだ仕上げられない（アーカイブ公開後に仕上げ）", () => {
		const drafts = [
			makeDraft("l1", "video-live11", "配信中の動画", 100, "2026-07-18T12:00:00.000Z"),
		];
		render(
			<CaptureView
				video={makeVideo("video-live11", "live")}
				initialDrafts={drafts}
				otherDraftsSummary={null}
			/>,
		);

		expect(screen.getByText("アーカイブ公開後に仕上げ")).toBeInTheDocument();
		expect(screen.queryByRole("link", { name: /まとめて仕上げる/ })).not.toBeInTheDocument();
		expect(screen.queryByRole("link", { name: /仕上げる/ })).not.toBeInTheDocument();
	});

	it("マークゼロなら M キーの案内を出す", () => {
		render(
			<CaptureView
				video={makeVideo("video-curr111", "archived")}
				initialDrafts={[]}
				otherDraftsSummary={null}
			/>,
		);

		expect(screen.getByText(/まだマークがありません/)).toBeInTheDocument();
	});

	it("他の配信の下書きは一覧せず、件数つきでマーク棚（/drafts）へ誘導する", () => {
		render(
			<CaptureView
				video={makeVideo("video-curr111", "archived")}
				initialDrafts={[]}
				otherDraftsSummary={{ videos: 2, drafts: 11 }}
			/>,
		);

		expect(screen.getByText(/他の配信の下書き（2配信・11件）は/)).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "マーク棚" })).toHaveAttribute("href", "/drafts");
	});

	it("動画未選択では今回のマーク欄自体を出さない（選択状態と棚への誘導だけ）", () => {
		render(
			<CaptureView video={null} initialDrafts={[]} otherDraftsSummary={{ videos: 1, drafts: 3 }} />,
		);

		expect(screen.getByText("マーキングする動画を選ぶ")).toBeInTheDocument();
		expect(screen.queryByText("今回のマーク")).not.toBeInTheDocument();
		expect(screen.getByRole("link", { name: "マーク棚" })).toHaveAttribute("href", "/drafts");
	});
});

describe("CaptureView の対象動画（配信・アーカイブ動画の両対応）", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("アーカイブ動画でもプレイヤーとマークボタンを出す", () => {
		render(
			<CaptureView
				video={makeVideo("video-arch11", "archived")}
				initialDrafts={[]}
				otherDraftsSummary={null}
			/>,
		);

		expect(screen.getByTestId("youtube-player")).toHaveAttribute("data-video-id", "video-arch11");
		expect(screen.getByRole("button", { name: /ここをマーク/ })).toBeInTheDocument();
		// 配信専用の文言ではなく、あとからまとめて仕上げる案内になる
		expect(screen.getByText(/あとからまとめて音声ボタンに仕上げられます/)).toBeInTheDocument();
	});

	it("埋め込み不可の動画ではプレイヤーもマークボタンも出さない", () => {
		render(
			<CaptureView
				video={makeVideo("video-noemb1", "archived", false)}
				initialDrafts={[]}
				otherDraftsSummary={null}
			/>,
		);

		expect(screen.queryByTestId("youtube-player")).not.toBeInTheDocument();
		expect(screen.queryByRole("button", { name: /ここをマーク/ })).not.toBeInTheDocument();
		expect(screen.getByText(/埋め込みが制限されている/)).toBeInTheDocument();
	});

	it("動画未選択は選択状態として表示する（配信が無いことをエラー扱いしない）", () => {
		render(<CaptureView video={null} initialDrafts={[]} otherDraftsSummary={null} />);

		expect(screen.getByText("マーキングする動画を選ぶ")).toBeInTheDocument();
		expect(screen.getByRole("link", { name: /動画一覧から選ぶ/ })).toHaveAttribute(
			"href",
			"/videos",
		);
	});

	it("指定した動画が見つからないときは理由を出す", () => {
		render(
			<CaptureView
				video={null}
				notFoundVideoId="video-miss11"
				initialDrafts={[]}
				otherDraftsSummary={null}
			/>,
		);

		expect(screen.getByText(/video-miss11.*見つかりません/)).toBeInTheDocument();
	});

	it("直前のマークを ±5 秒でずらせる（生信号 playerTime を更新する）", async () => {
		const user = userEvent.setup();
		const drafts = [
			makeDraft("d1", "video-curr111", "表示中の動画", 100, "2026-07-16T12:00:00.000Z"),
		];
		mockUpdatePlayerTime.mockResolvedValue({
			success: true,
			data: { ...drafts[0], playerTime: 110, suggestedStartTime: 95 },
		});
		render(
			<CaptureView
				video={makeVideo("video-curr111", "archived")}
				initialDrafts={drafts}
				otherDraftsSummary={null}
			/>,
		);

		// makeDraft は playerTime = suggestedStartTime + 15 = 115
		await user.click(screen.getByRole("button", { name: /開始位置を5秒後にする/ }));

		await waitFor(() => expect(mockUpdatePlayerTime).toHaveBeenCalledWith("d1", 120));
	});

	it("壁時計のみの下書きしかなければ微調整を出さない（位置を持たないため）", () => {
		const wallClockOnly: AudioButtonDraft = {
			...makeDraft("w1", "video-curr111", "表示中の動画", 0, "2026-07-16T12:00:00.000Z"),
			playerTime: null,
		};
		render(
			<CaptureView
				video={makeVideo("video-curr111", "archived")}
				initialDrafts={[wallClockOnly]}
				otherDraftsSummary={null}
			/>,
		);

		expect(screen.queryByText("直前のマーク")).not.toBeInTheDocument();
	});
});
