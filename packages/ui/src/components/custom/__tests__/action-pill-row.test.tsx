/**
 * @vitest-environment happy-dom
 */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ActionPillRow } from "../action-pill-row";

const baseProps = {
	isFavorite: false,
	isLiked: false,
	likeCount: 2,
	shareUrl: "https://x.com/intent/post?text=test",
};

describe("ActionPillRow", () => {
	it("お気に入り・高評価・共有の3アクションを表示する（default）", () => {
		render(<ActionPillRow {...baseProps} />);

		expect(screen.getByRole("button", { name: "お気に入り" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "高評価 2" })).toBeInTheDocument();
		const share = screen.getByRole("link", { name: "Xで共有" });
		expect(share).toHaveAttribute("href", baseProps.shareUrl);
		expect(share).toHaveAttribute("target", "_blank");
		expect(share).toHaveAttribute("rel", "noopener noreferrer");
	});

	it("sm サイズは高評価が数値のみ・共有ラベルが「共有」になる", () => {
		render(<ActionPillRow {...baseProps} size="sm" />);

		expect(screen.getByRole("button", { name: "2" })).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "共有" })).toBeInTheDocument();
	});

	it("お気に入り済み状態はラベルと aria-pressed が変わる", () => {
		render(<ActionPillRow {...baseProps} isFavorite />);

		const fav = screen.getByRole("button", { name: "お気に入り済み" });
		expect(fav).toHaveAttribute("aria-pressed", "true");
	});

	it("高評価済みは aria-pressed=true", () => {
		render(<ActionPillRow {...baseProps} isLiked />);

		expect(screen.getByRole("button", { name: "高評価 2" })).toHaveAttribute(
			"aria-pressed",
			"true",
		);
	});

	it("トグルのコールバックが発火する", async () => {
		const user = userEvent.setup();
		const onFav = vi.fn();
		const onLike = vi.fn();
		render(<ActionPillRow {...baseProps} onFavoriteToggle={onFav} onLikeToggle={onLike} />);

		await user.click(screen.getByRole("button", { name: "お気に入り" }));
		await user.click(screen.getByRole("button", { name: "高評価 2" }));

		expect(onFav).toHaveBeenCalledTimes(1);
		expect(onLike).toHaveBeenCalledTimes(1);
	});

	it("低評価 UI を持たない（製品判断の回帰ガード）", () => {
		render(<ActionPillRow {...baseProps} />);

		expect(screen.queryByText(/低評価/)).not.toBeInTheDocument();
	});
});
