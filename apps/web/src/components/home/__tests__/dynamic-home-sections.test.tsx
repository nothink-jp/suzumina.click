import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CommunitySection } from "../dynamic-home-sections";

describe("CommunitySection (SPR-150)", () => {
	it("「音声ボタンを作る」CTAは動画一覧(/videos)へ遷移する（video_id無しで/buttons/createへ飛びエラーに落ちていたバグの修正）", () => {
		render(<CommunitySection />);

		const cta = screen.getByRole("link", { name: "音声ボタンを作る" });
		expect(cta).toHaveAttribute("href", "/videos");
	});

	it("「サイトについて」CTAは変更しない", () => {
		render(<CommunitySection />);

		const aboutLink = screen.getByRole("link", { name: "サイトについて" });
		expect(aboutLink).toHaveAttribute("href", "/about");
	});
});
