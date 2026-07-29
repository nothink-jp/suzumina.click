import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { resolveVideoViewTab, VideoViewTabs } from "../video-view-tabs";

describe("resolveVideoViewTab（URL が状態の正本）", () => {
	it("既定は新着", () => {
		expect(resolveVideoViewTab({})).toBe("newest");
	});

	it("sort=least_buttons は拾える配信", () => {
		expect(resolveVideoViewTab({ videoType: "live_archive", sort: "least_buttons" })).toBe(
			"pickable",
		);
	});

	it("videoType=live_upcoming は配信中・予定（sort より優先）", () => {
		expect(resolveVideoViewTab({ videoType: "live_upcoming", sort: "least_buttons" })).toBe(
			"live_upcoming",
		);
	});
});

describe("VideoViewTabs", () => {
	it("3タブがプリセット URL への Link で、アクティブに aria-current が付く", () => {
		render(<VideoViewTabs active="pickable" />);

		expect(screen.getByRole("link", { name: "新着" })).toHaveAttribute("href", "/videos");
		const pickable = screen.getByRole("link", { name: "拾える配信" });
		expect(pickable).toHaveAttribute("href", "/videos?videoType=live_archive&sort=least_buttons");
		expect(pickable).toHaveAttribute("aria-current", "page");
		expect(screen.getByRole("link", { name: "配信中・予定" })).toHaveAttribute(
			"href",
			"/videos?videoType=live_upcoming",
		);
	});
});
