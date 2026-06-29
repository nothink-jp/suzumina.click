import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DiscordIcon } from "../discord-icon";

describe("DiscordIcon", () => {
	it("title 省略時は装飾アイコン（aria-hidden）として描画する", () => {
		const { container } = render(<DiscordIcon className="w-4 h-4" />);
		const svg = container.querySelector("svg");
		expect(svg).not.toBeNull();
		expect(svg).toHaveAttribute("aria-hidden", "true");
		expect(svg?.querySelector("title")).toBeNull();
		expect(svg).toHaveClass("w-4", "h-4");
	});

	it("title 指定時は <title> を出し aria-hidden を付けない", () => {
		const { container } = render(<DiscordIcon className="w-5 h-5" title="Discordアイコン" />);
		const svg = container.querySelector("svg");
		expect(svg).not.toHaveAttribute("aria-hidden");
		expect(svg?.querySelector("title")?.textContent).toBe("Discordアイコン");
	});
});
