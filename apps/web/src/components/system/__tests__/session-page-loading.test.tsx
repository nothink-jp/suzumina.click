import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import SessionPageLoading from "../session-page-loading";

describe("SessionPageLoading", () => {
	it("読み込み中であることを支援技術に伝える", () => {
		render(<SessionPageLoading />);

		const status = screen.getByRole("status");
		expect(status).toHaveAttribute("aria-busy", "true");
		expect(status).toHaveTextContent("読み込み中");
	});
});
