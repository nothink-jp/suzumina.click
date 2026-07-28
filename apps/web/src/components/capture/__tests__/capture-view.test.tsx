import type { AudioButtonDraft, VideoPlainObject } from "@suzumina.click/shared-types";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CaptureView } from "../capture-view";

const mockCreateDraft = vi.fn();
const mockUpdatePlayerTime = vi.fn();
vi.mock("@/actions/button-drafts", () => ({
	createButtonDraft: (...args: unknown[]) => mockCreateDraft(...args),
	deleteButtonDraft: vi.fn().mockResolvedValue({ success: true }),
	updateButtonDraftPlayerTime: (...args: unknown[]) => mockUpdatePlayerTime(...args),
}));

vi.mock("@/lib/analytics/events", () => ({
	trackMarkDraft: vi.fn(),
}));

const mockPush = vi.fn();
const mockBack = vi.fn();
vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: mockPush, back: mockBack }),
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

function renderView(props: Partial<Parameters<typeof CaptureView>[0]> = {}) {
	return render(
		<CaptureView
			video={makeVideo("video-curr111", "archived")}
			initialDrafts={[]}
			otherDraftsSummary={null}
			madeMarks={[]}
			videoDurationSeconds={3600}
			{...props}
		/>,
	);
}

describe("CaptureView の今回のマーク（集中モード・導線再設計 段2）", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("下書きは新しい順に並び、まとめて仕上げるは固定バーから推奨開始秒最小の下書きを開く", () => {
		const drafts = [
			makeDraft("a2", "video-curr111", "表示中の動画", 300, "2026-07-15T12:10:00.000Z"),
			makeDraft("a1", "video-curr111", "表示中の動画", 100, "2026-07-15T12:05:00.000Z"),
		];
		renderView({ initialDrafts: drafts });

		expect(screen.getByText("今回のマーク")).toBeInTheDocument();
		// 新しい順 = 渡した順（createdAt 降順）を維持
		const rows = screen.getAllByText(/から$/).map((el) => el.textContent);
		expect(rows[0]).toContain("05:00");
		// まとめて仕上げる = 開始秒が最小の a1 から（表示順とは独立）
		const bulkLink = screen.getByRole("link", { name: /まとめて仕上げる/ });
		expect(bulkLink).toHaveAttribute(
			"href",
			"/buttons/create?video_id=video-curr111&start_time=100&draft_id=a1",
		);
	});

	it("配信中は仕上げ導線を出さない（アーカイブ公開後に仕上げ）", () => {
		const drafts = [
			makeDraft("l1", "video-live11", "配信中の動画", 100, "2026-07-18T12:00:00.000Z"),
		];
		renderView({ video: makeVideo("video-live11", "live"), initialDrafts: drafts });

		expect(screen.getByText("アーカイブ公開後に仕上げ")).toBeInTheDocument();
		expect(screen.queryByRole("link", { name: /まとめて仕上げる/ })).not.toBeInTheDocument();
		expect(screen.queryByRole("link", { name: /仕上げる/ })).not.toBeInTheDocument();
	});

	it("マークゼロなら M キーの案内を出す", () => {
		renderView();

		expect(screen.getByText(/まだマークがありません/)).toBeInTheDocument();
	});

	it("他の配信の下書きは一覧せず、件数つきでマーク棚（/drafts）へ誘導する", () => {
		renderView({ otherDraftsSummary: { videos: 2, drafts: 11 } });

		expect(screen.getByText(/他の配信の下書き（2配信・11件）は/)).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "マーク棚" })).toHaveAttribute("href", "/drafts");
	});

	it("マークすると4秒チップが出て、±5秒が生信号 playerTime を更新する", async () => {
		const user = userEvent.setup();
		const created = makeDraft(
			"new1",
			"video-curr111",
			"表示中の動画",
			100,
			"2026-07-16T12:00:00.000Z",
		);
		mockCreateDraft.mockResolvedValue({ success: true, data: created });
		mockUpdatePlayerTime.mockResolvedValue({
			success: true,
			data: { ...created, playerTime: 120, suggestedStartTime: 105 },
		});
		renderView();

		await user.click(screen.getByRole("button", { name: /ここをマーク/ }));

		// チップ: マーク時刻（playerTime）表示 + NEW バッジがキュー先頭に付く
		expect(await screen.findByText("01:55 をマーク")).toBeInTheDocument();
		expect(screen.getByText("NEW")).toBeInTheDocument();

		// チップの +5 秒 → 生信号 playerTime(115) + 5 = 120
		await user.click(screen.getByRole("button", { name: /開始位置を5秒後にする/ }));
		await waitFor(() => expect(mockUpdatePlayerTime).toHaveBeenCalledWith("new1", 120));
	});

	it("初期表示ではチップを出さない（このセッションでマークしたときだけ）", () => {
		const drafts = [
			makeDraft("d1", "video-curr111", "表示中の動画", 100, "2026-07-16T12:00:00.000Z"),
		];
		renderView({ initialDrafts: drafts });

		expect(screen.queryByText(/をマーク$/)).not.toBeInTheDocument();
		expect(screen.queryByRole("button", { name: /開始位置を5秒後にする/ })).not.toBeInTheDocument();
	});

	it("マーク位置レーンに作成済みと今回のマークの件数を出す", () => {
		const drafts = [
			makeDraft("d1", "video-curr111", "表示中の動画", 100, "2026-07-16T12:00:00.000Z"),
		];
		renderView({ initialDrafts: drafts, madeMarks: [10, 20, 30] });

		expect(screen.getByText(/作成済み 3 ・ 今回のマーク/)).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /マーク位置レーン/ })).toBeInTheDocument();
	});
});

describe("CaptureView の対象動画（配信・アーカイブ動画の両対応）", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("アーカイブ動画でもプレイヤーと固定マークバーを出す", () => {
		renderView({ video: makeVideo("video-arch11", "archived") });

		expect(screen.getByTestId("youtube-player")).toHaveAttribute("data-video-id", "video-arch11");
		expect(screen.getByRole("button", { name: /ここをマーク/ })).toBeInTheDocument();
	});

	it("埋め込み不可の動画ではプレイヤーも固定マークバーも出さない", () => {
		renderView({ video: makeVideo("video-noemb1", "archived", false) });

		expect(screen.queryByTestId("youtube-player")).not.toBeInTheDocument();
		expect(screen.queryByRole("button", { name: /ここをマーク/ })).not.toBeInTheDocument();
		expect(screen.getByText(/埋め込みが制限されている/)).toBeInTheDocument();
	});

	it("動画未選択は選択状態として表示する（配信が無いことをエラー扱いしない）", () => {
		renderView({ video: null });

		expect(screen.getByText("マーキングする動画を選ぶ")).toBeInTheDocument();
		expect(screen.getByRole("link", { name: /動画一覧から選ぶ/ })).toHaveAttribute(
			"href",
			"/videos",
		);
	});

	it("指定した動画が見つからないときは理由を出す", () => {
		renderView({ video: null, notFoundVideoId: "video-miss11" });

		expect(screen.getByText(/video-miss11.*見つかりません/)).toBeInTheDocument();
	});

	it("動画未選択でも他の配信の下書きへの導線は出す", () => {
		renderView({ video: null, otherDraftsSummary: { videos: 1, drafts: 3 } });

		expect(screen.getByRole("link", { name: "マーク棚" })).toHaveAttribute("href", "/drafts");
	});
});
