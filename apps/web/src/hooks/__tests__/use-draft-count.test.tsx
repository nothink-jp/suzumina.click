import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCount = vi.fn();
vi.mock("@/actions/button-drafts", () => ({
	countMyButtonDrafts: () => mockCount(),
}));

const { refreshDraftCount, useDraftCount } = await import("../use-draft-count");

function Badge({ enabled = true }: { enabled?: boolean }) {
	const count = useDraftCount(enabled);
	return <span data-testid="badge">{count == null ? "—" : count}</span>;
}

describe("useDraftCount（ナビ「マーク N」バッジ）", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// モジュールキャッシュを捨ててテスト間の独立性を保つ
		refreshDraftCount();
	});

	it("マウント時に件数を取得する", async () => {
		mockCount.mockResolvedValue(3);
		render(<Badge />);

		await waitFor(() => expect(screen.getByTestId("badge")).toHaveTextContent("3"));
	});

	it("同時マウントでも count() 集約は1回だけ（Promise 共有）", async () => {
		mockCount.mockResolvedValue(2);
		render(
			<>
				<Badge />
				<Badge />
			</>,
		);

		await waitFor(() => {
			expect(screen.getAllByTestId("badge")[0]).toHaveTextContent("2");
		});
		expect(mockCount).toHaveBeenCalledTimes(1);
	});

	it("refreshDraftCount で表示中のバッジが再取得され更新される（レイアウト常駐で再マウントされないため）", async () => {
		mockCount.mockResolvedValue(4);
		render(<Badge />);
		await waitFor(() => expect(screen.getByTestId("badge")).toHaveTextContent("4"));

		// 下書きを1件マークしたあとを模す
		mockCount.mockResolvedValue(5);
		refreshDraftCount();

		await waitFor(() => expect(screen.getByTestId("badge")).toHaveTextContent("5"));
		expect(mockCount).toHaveBeenCalledTimes(2);
	});

	it("誰も表示していなければ再取得しない（無駄な集約を投げない）", () => {
		mockCount.mockResolvedValue(1);
		refreshDraftCount();

		expect(mockCount).not.toHaveBeenCalled();
	});

	it("enabled=false（未ログイン）では取得しない", () => {
		mockCount.mockResolvedValue(9);
		render(<Badge enabled={false} />);

		expect(mockCount).not.toHaveBeenCalled();
		expect(screen.getByTestId("badge")).toHaveTextContent("—");
	});

	it("取得に失敗しても 0 に倒す（バッジは再訪の動機づけであって正確性の契約ではない）", async () => {
		mockCount.mockRejectedValue(new Error("boom"));
		render(<Badge />);

		await waitFor(() => expect(screen.getByTestId("badge")).toHaveTextContent("0"));
	});
});
