import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRouter } from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import HomeSearch from "../home-search";

vi.mock("next/navigation", () => ({
	useRouter: vi.fn(),
}));

const mockPush = vi.fn();

describe("HomeSearch", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		(useRouter as unknown as ReturnType<typeof vi.fn>).mockReturnValue({ push: mockPush });
	});

	it("デフォルト対象（音声ボタン）で /buttons?q= に遷移する", async () => {
		const user = userEvent.setup();
		render(<HomeSearch />);

		await user.type(screen.getByRole("textbox"), "おはよう");
		await user.click(screen.getByRole("button", { name: "検索" }));

		expect(mockPush).toHaveBeenCalledWith("/buttons?q=%E3%81%8A%E3%81%AF%E3%82%88%E3%81%86");
	});

	it("対象を動画に切り替えると /videos?q= に遷移する", async () => {
		const user = userEvent.setup();
		render(<HomeSearch />);

		await user.click(screen.getByRole("button", { name: "動画" }));
		await user.type(screen.getByRole("textbox"), "歌枠");
		await user.click(screen.getByRole("button", { name: "検索" }));

		expect(mockPush).toHaveBeenCalledWith("/videos?q=%E6%AD%8C%E6%9E%A0");
	});

	it("対象を作品に切り替えると /works?q= に遷移する", async () => {
		const user = userEvent.setup();
		render(<HomeSearch />);

		await user.click(screen.getByRole("button", { name: "作品" }));
		await user.type(screen.getByRole("textbox"), "ASMR");
		await user.click(screen.getByRole("button", { name: "検索" }));

		expect(mockPush).toHaveBeenCalledWith("/works?q=ASMR");
	});

	it("空クエリでは遷移しない", async () => {
		const user = userEvent.setup();
		render(<HomeSearch />);

		await user.type(screen.getByRole("textbox"), "   ");
		await user.click(screen.getByRole("button", { name: "検索" }));

		expect(mockPush).not.toHaveBeenCalled();
	});
});
