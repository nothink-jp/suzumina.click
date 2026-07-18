import type { AudioButtonDraft, VideoPlainObject } from "@suzumina.click/shared-types";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LiveCaptureView } from "../live-capture-view";

vi.mock("@/actions/button-drafts", () => ({
	createButtonDraft: vi.fn().mockResolvedValue({ success: true, data: {} }),
	deleteButtonDraft: vi.fn().mockResolvedValue({ success: true }),
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

describe("LiveCaptureView の下書きキュー表示（SPR-266 第2段）", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("下書きが動画単位にグルーピングされ、件数と「まとめて仕上げる」が表示される", () => {
		const drafts = [
			makeDraft("a2", "video-aaaaaaa", "アーカイブ配信A", 300, "2026-07-15T12:10:00.000Z"),
			makeDraft("a1", "video-aaaaaaa", "アーカイブ配信A", 100, "2026-07-15T12:05:00.000Z"),
			makeDraft("b1", "video-bbbbbbb", "アーカイブ配信B", 50, "2026-07-10T10:00:00.000Z"),
		];
		render(<LiveCaptureView video={null} initialDrafts={drafts} />);

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
		render(<LiveCaptureView video={liveVideo} initialDrafts={drafts} />);

		expect(screen.getByText("アーカイブ公開後に仕上げ")).toBeInTheDocument();
		expect(screen.queryByRole("link", { name: /まとめて仕上げる/ })).not.toBeInTheDocument();
		expect(screen.queryByRole("link", { name: /仕上げる/ })).not.toBeInTheDocument();
	});

	it("下書きゼロなら空状態の案内を出す", () => {
		render(<LiveCaptureView video={null} initialDrafts={[]} />);

		expect(screen.getByText(/まだ下書きがありません/)).toBeInTheDocument();
	});
});
