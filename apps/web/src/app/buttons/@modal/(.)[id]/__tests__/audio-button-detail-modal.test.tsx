import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AudioButtonDetailModal } from "../audio-button-detail-modal";

const backMock = vi.fn();
vi.mock("next/navigation", () => ({
	useRouter: () => ({ back: backMock, push: vi.fn(), refresh: vi.fn() }),
}));

describe("AudioButtonDetailModal", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("children とフル詳細ページへの「ページで開く」リンクを表示する", () => {
		render(
			<AudioButtonDetailModal audioButtonId="abc123">
				<div data-testid="detail-content">詳細コンテンツ</div>
			</AudioButtonDetailModal>,
		);

		expect(screen.getByTestId("detail-content")).toBeInTheDocument();

		// soft nav ではモーダルが解除されないため、素の <a>（フルロード）であることが重要
		const link = screen.getByRole("link", { name: /ページで開く/ });
		expect(link).toHaveAttribute("href", "/buttons/abc123");
	});

	it("閉じるボタンで router.back を呼ぶ（履歴で一覧へ戻す）", async () => {
		const user = userEvent.setup();
		render(
			<AudioButtonDetailModal audioButtonId="abc123">
				<div>詳細</div>
			</AudioButtonDetailModal>,
		);

		await user.click(screen.getByRole("button", { name: "Close" }));

		expect(backMock).toHaveBeenCalledTimes(1);
	});
});
