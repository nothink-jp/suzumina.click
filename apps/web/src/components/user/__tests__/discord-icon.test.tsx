import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DiscordIcon } from "../discord-icon";

describe("DiscordIcon", () => {
	it("装飾アイコン（aria-hidden）として描画し、className を反映する", () => {
		const { container } = render(<DiscordIcon className="w-4 h-4" />);
		const svg = container.querySelector("svg");
		expect(svg).not.toBeNull();
		expect(svg).toHaveAttribute("aria-hidden", "true");
		expect(svg?.querySelector("title")).toBeNull();
		expect(svg).toHaveClass("w-4", "h-4");
	});
});
