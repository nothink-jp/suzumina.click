import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OpenByVideoId } from "../open-by-video-id";

const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: mockPush }),
}));

describe("OpenByVideoId（URL・ID の直接指定・旧 /watch 未選択状態の移設先）", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("折りたたみを開いて URL を入れると /watch?v= へ遷移する", async () => {
		const user = userEvent.setup();
		render(<OpenByVideoId />);

		await user.click(screen.getByRole("button", { name: /URL・ID を直接ひらく/ }));
		await user.type(screen.getByPlaceholderText(/URL または ID/), "https://youtu.be/9kMBmEvhwUk");
		await user.click(screen.getByRole("button", { name: "マークして見る" }));

		expect(mockPush).toHaveBeenCalledWith("/watch?v=9kMBmEvhwUk");
	});

	it("不正な入力はエラーを出して遷移しない", async () => {
		const user = userEvent.setup();
		render(<OpenByVideoId />);

		await user.click(screen.getByRole("button", { name: /URL・ID を直接ひらく/ }));
		await user.type(screen.getByPlaceholderText(/URL または ID/), "short");
		await user.click(screen.getByRole("button", { name: "マークして見る" }));

		expect(screen.getByText(/11文字/)).toBeInTheDocument();
		expect(mockPush).not.toHaveBeenCalled();
	});
});
