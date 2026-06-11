import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// 取得アクションをモック（成功/失敗を切り替える）
vi.mock("../../evaluation-actions", () => ({
	getUserTop10List: vi.fn(),
}));

// ロガーをモック（失敗時に呼ばれることを検証）
vi.mock("@/lib/logger", () => ({
	error: vi.fn(),
}));

import { error as logError } from "@/lib/logger";
import { getUserTop10List } from "../../evaluation-actions";
import { Top10RankModal } from "../top10-rank-modal";

const baseProps = {
	isOpen: true,
	onClose: () => {},
	onSelect: () => {},
	workTitle: "テスト作品",
	workId: "RJ123",
};

describe("Top10RankModal", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("取得失敗時はエラー表示にし、ログ出力する（空スロットで誤解させない）", async () => {
		vi.mocked(getUserTop10List).mockRejectedValue(new Error("boom"));

		render(<Top10RankModal {...baseProps} />);

		expect(await screen.findByText("10選リストの読み込みに失敗しました")).toBeTruthy();
		expect(logError).toHaveBeenCalled();
		// エラー時は順位スロット（選択不可/空き）を描画しない
		expect(screen.queryByText("選択不可")).toBeNull();
	});

	it("取得成功時は順位リストを表示する", async () => {
		vi.mocked(getUserTop10List).mockResolvedValue({ rankings: {}, totalCount: 0 } as any);

		render(<Top10RankModal {...baseProps} />);

		// totalCount=0 のため 2 位以降は「選択不可」で描画される＝リスト分岐
		expect((await screen.findAllByText("選択不可")).length).toBeGreaterThan(0);
		expect(screen.queryByText("10選リストの読み込みに失敗しました")).toBeNull();
		expect(logError).not.toHaveBeenCalled();
	});
});
