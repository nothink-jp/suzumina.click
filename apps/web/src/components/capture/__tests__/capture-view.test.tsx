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

describe("CaptureView の下書きキュー表示（SPR-266 第2段）", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("下書きが動画単位にグルーピングされ、件数と「まとめて仕上げる」が表示される", () => {
		const drafts = [
			makeDraft("a2", "video-aaaaaaa", "アーカイブ配信A", 300, "2026-07-15T12:10:00.000Z"),
			makeDraft("a1", "video-aaaaaaa", "アーカイブ配信A", 100, "2026-07-15T12:05:00.000Z"),
			makeDraft("b1", "video-bbbbbbb", "アーカイブ配信B", 50, "2026-07-10T10:00:00.000Z"),
		];
		render(<CaptureView video={null} initialDrafts={drafts} awaitingArchiveVideoIds={[]} />);

		// グループヘッダ（動画タイトル + 件数）
		expect(screen.getByText("アーカイブ配信A")).toBeInTheDocument();
		expect(screen.getByText("2件の下書き")).toBeInTheDocument();
		expect(screen.getByText("アーカイブ配信B")).toBeInTheDocument();
		expect(screen.getByText("1件の下書き")).toBeInTheDocument();

		// まとめて仕上げる = グループ先頭（推奨開始秒が最小）の下書きから開く
		const bulkLinks = screen.getAllByRole("link", { name: /まとめて仕上げる/ });
		expect(bulkLinks).toHaveLength(2);
		expect(bulkLinks[0]).toHaveAttribute(
			"href",
			"/buttons/create?video_id=video-aaaaaaa&start_time=100&draft_id=a1",
		);
	});

	it("配信中の動画グループは仕上げ導線を出さない（アーカイブ公開後に仕上げ）", () => {
		const liveVideo = {
			videoId: "video-live11",
			title: "配信中の動画",
			_computed: { videoType: "live" },
		} as unknown as VideoPlainObject;
		const drafts = [
			makeDraft("l1", "video-live11", "配信中の動画", 100, "2026-07-18T12:00:00.000Z"),
		];
		render(
			<CaptureView
				video={liveVideo}
				initialDrafts={drafts}
				awaitingArchiveVideoIds={["video-live11"]}
			/>,
		);

		expect(screen.getByText("アーカイブ公開後に仕上げ")).toBeInTheDocument();
		expect(screen.queryByRole("link", { name: /まとめて仕上げる/ })).not.toBeInTheDocument();
		expect(screen.queryByRole("link", { name: /仕上げる/ })).not.toBeInTheDocument();
	});

	it("表示していない動画でも配信中なら仕上げ導線を出さない", () => {
		// 表示中の動画との一致で判定していた頃は、この配信中グループが仕上げ可能に見えて
		// 遷移先の canCreateAudioButton で弾かれていた
		const drafts = [
			makeDraft("l1", "video-live11", "別配信（配信中）", 100, "2026-07-18T12:00:00.000Z"),
			makeDraft("a1", "video-arch11", "アーカイブ", 50, "2026-07-17T12:00:00.000Z"),
		];
		render(
			<CaptureView
				video={null}
				initialDrafts={drafts}
				awaitingArchiveVideoIds={["video-live11"]}
			/>,
		);

		expect(screen.getByText("アーカイブ公開後に仕上げ")).toBeInTheDocument();
		// 仕上げ導線が出るのはアーカイブ側のグループだけ
		const bulkLinks = screen.getAllByRole("link", { name: /まとめて仕上げる/ });
		expect(bulkLinks).toHaveLength(1);
		expect(bulkLinks[0]).toHaveAttribute(
			"href",
			"/buttons/create?video_id=video-arch11&start_time=50&draft_id=a1",
		);
	});

	it("下書きゼロなら空状態の案内を出す", () => {
		render(<CaptureView video={null} initialDrafts={[]} awaitingArchiveVideoIds={[]} />);

		expect(screen.getByText(/まだ下書きがありません/)).toBeInTheDocument();
	});
});

function makeVideo(videoId: string, videoType: string, embeddable = true): VideoPlainObject {
	return {
		videoId,
		title: `動画 ${videoId}`,
		status: { embeddable },
		_computed: { videoType },
	} as unknown as VideoPlainObject;
}

describe("CaptureView の対象動画（配信・アーカイブ動画の両対応）", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("アーカイブ動画でもプレイヤーとマークボタンを出す", () => {
		render(
			<CaptureView
				video={makeVideo("video-arch11", "archived")}
				initialDrafts={[]}
				awaitingArchiveVideoIds={[]}
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
				awaitingArchiveVideoIds={[]}
			/>,
		);

		expect(screen.queryByTestId("youtube-player")).not.toBeInTheDocument();
		expect(screen.queryByRole("button", { name: /ここをマーク/ })).not.toBeInTheDocument();
		expect(screen.getByText(/埋め込みが制限されている/)).toBeInTheDocument();
	});

	it("動画未選択は選択状態として表示する（配信が無いことをエラー扱いしない）", () => {
		render(<CaptureView video={null} initialDrafts={[]} awaitingArchiveVideoIds={[]} />);

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
				awaitingArchiveVideoIds={[]}
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
				awaitingArchiveVideoIds={[]}
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
				awaitingArchiveVideoIds={[]}
			/>,
		);

		expect(screen.queryByText("直前のマーク")).not.toBeInTheDocument();
	});

	it("表示中でない動画のグループには「マークを続ける」を出す", () => {
		const drafts = [
			makeDraft("a1", "video-aaaaaaa", "別の動画", 100, "2026-07-15T12:05:00.000Z"),
			makeDraft("c1", "video-curr111", "表示中の動画", 50, "2026-07-16T12:00:00.000Z"),
		];
		render(
			<CaptureView
				video={makeVideo("video-curr111", "archived")}
				initialDrafts={drafts}
				awaitingArchiveVideoIds={[]}
			/>,
		);

		const resumeLinks = screen.getAllByRole("link", { name: /マークを続ける/ });
		expect(resumeLinks).toHaveLength(1);
		expect(resumeLinks[0]).toHaveAttribute("href", "/watch?v=video-aaaaaaa");
	});
});
