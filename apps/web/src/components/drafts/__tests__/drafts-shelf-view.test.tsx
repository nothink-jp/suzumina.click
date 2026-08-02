import type { AudioButtonDraft } from "@suzumina.click/shared-types";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DraftsShelfView } from "../drafts-shelf-view";

const mockUpdatePlayerTime = vi.fn();
const mockDelete = vi.fn();
vi.mock("@/actions/button-drafts", () => ({
	deleteButtonDraft: (...args: unknown[]) => mockDelete(...args),
	updateButtonDraftPlayerTime: (...args: unknown[]) => mockUpdatePlayerTime(...args),
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

describe("DraftsShelfView（マーク棚・導線再設計 段2）", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("配信の束が古い順に並び、まとめて仕上げる・見ながら足すが出る", () => {
		const drafts = [
			makeDraft("new1", "video-newer11", "新しい配信", 100, "2026-07-27T12:00:00.000Z"),
			makeDraft("old1", "video-older11", "古い配信", 50, "2026-07-16T12:00:00.000Z"),
			makeDraft("old2", "video-older11", "古い配信", 200, "2026-07-16T12:30:00.000Z"),
		];
		render(<DraftsShelfView initialDrafts={drafts} videoInfos={{}} />);

		// 古い順（先に拾ったものから片付ける）
		const sections = screen.getAllByRole("region");
		expect(sections[0]).toHaveAccessibleName("古い配信");
		expect(sections[1]).toHaveAccessibleName("新しい配信");

		// まとめて仕上げる = 束の先頭（推奨開始秒が最小）から
		const bulkLinks = screen.getAllByRole("link", { name: /まとめて仕上げる/ });
		expect(bulkLinks[0]).toHaveAttribute(
			"href",
			"/buttons/create?video_id=video-older11&start_time=50&draft_id=old1&entry=drafts_bulk",
		);
		expect(bulkLinks[0]).toHaveTextContent("まとめて仕上げる（2）");

		// 見ながら足す = /watch へ戻る復帰導線
		const resumeLinks = screen.getAllByRole("link", { name: /見ながら足す/ });
		expect(resumeLinks[0]).toHaveAttribute("href", "/watch?v=video-older11");
	});

	it("配信中の束は仕上げ導線を出さず「配信に戻る」を出す", () => {
		const drafts = [
			makeDraft("l1", "video-live111", "配信中の動画", 100, "2026-07-18T12:00:00.000Z"),
		];
		render(
			<DraftsShelfView
				initialDrafts={drafts}
				videoInfos={{
					"video-live111": { isAwaitingArchive: true, audioButtonCount: 0 },
				}}
			/>,
		);

		expect(screen.getByText("アーカイブ公開後に仕上げられます")).toBeInTheDocument();
		expect(screen.getByRole("link", { name: /配信に戻る/ })).toHaveAttribute(
			"href",
			"/watch?v=video-live111",
		);
		expect(screen.queryByRole("link", { name: /まとめて仕上げる/ })).not.toBeInTheDocument();
		expect(screen.queryByRole("link", { name: /この1件を仕上げる/ })).not.toBeInTheDocument();
	});

	it("作成済みボタン数を束のメタ情報に出す", () => {
		const drafts = [makeDraft("a1", "video-arch111", "アーカイブ", 50, "2026-07-16T12:00:00.000Z")];
		render(
			<DraftsShelfView
				initialDrafts={drafts}
				videoInfos={{
					"video-arch111": { isAwaitingArchive: false, audioButtonCount: 2 },
				}}
			/>,
		);

		expect(screen.getByText(/作成済み 2本/)).toBeInTheDocument();
	});

	it("行の ±5秒 が生信号 playerTime を更新する", async () => {
		const user = userEvent.setup();
		const drafts = [
			makeDraft("d1", "video-arch111", "アーカイブ", 100, "2026-07-16T12:00:00.000Z"),
		];
		mockUpdatePlayerTime.mockResolvedValue({
			success: true,
			data: { ...drafts[0], playerTime: 120, suggestedStartTime: 105 },
		});
		render(<DraftsShelfView initialDrafts={drafts} videoInfos={{}} />);

		// makeDraft は playerTime = 115
		await user.click(screen.getByRole("button", { name: /開始位置を5秒後にする/ }));
		await waitFor(() => expect(mockUpdatePlayerTime).toHaveBeenCalledWith("d1", 120));
	});

	it("削除すると束から消える（最後の1件なら束ごと消える）", async () => {
		const user = userEvent.setup();
		mockDelete.mockResolvedValue({ success: true });
		const drafts = [
			makeDraft("d1", "video-arch111", "アーカイブ", 100, "2026-07-16T12:00:00.000Z"),
		];
		render(<DraftsShelfView initialDrafts={drafts} videoInfos={{}} />);

		await user.click(screen.getByRole("button", { name: "下書きを削除" }));

		await waitFor(() => {
			expect(screen.queryByRole("region")).not.toBeInTheDocument();
		});
		expect(screen.getByText(/まだ下書きがありません/)).toBeInTheDocument();
	});

	it("下書きゼロは空状態と動画選択への導線を出す", () => {
		render(<DraftsShelfView initialDrafts={[]} videoInfos={{}} />);

		expect(screen.getByText(/まだ下書きがありません/)).toBeInTheDocument();
		expect(screen.getByRole("link", { name: /動画を選んでマークする/ })).toHaveAttribute(
			"href",
			"/videos",
		);
	});
});
