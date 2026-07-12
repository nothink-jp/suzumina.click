import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RabbitMark, SakuraMark } from "../brand-mark";

describe("SakuraMark", () => {
	it("既定サイズ(24)とviewBoxで描画される", () => {
		const { container } = render(<SakuraMark />);
		const svg = container.querySelector("svg");
		expect(svg).toHaveAttribute("viewBox", "0 0 512 512");
		expect(svg).toHaveAttribute("width", "24");
		expect(svg).toHaveAttribute("height", "24");
		expect(svg).toHaveAttribute("aria-hidden", "true");
	});

	it("size / className を反映する", () => {
		const { container } = render(<SakuraMark size={48} className="text-suzuka-500" />);
		const svg = container.querySelector("svg");
		expect(svg).toHaveAttribute("width", "48");
		expect(svg).toHaveAttribute("height", "48");
		expect(svg).toHaveClass("text-suzuka-500");
	});

	it("5枚の花びらパスを持つ", () => {
		const { container } = render(<SakuraMark />);
		expect(container.querySelectorAll("path")).toHaveLength(5);
	});
});

describe("RabbitMark", () => {
	it("既定サイズ(24)とviewBoxで描画される", () => {
		const { container } = render(<RabbitMark />);
		const svg = container.querySelector("svg");
		expect(svg).toHaveAttribute("viewBox", "0 0 512 512");
		expect(svg).toHaveAttribute("width", "24");
		expect(svg).toHaveAttribute("height", "24");
		expect(svg).toHaveAttribute("aria-hidden", "true");
	});

	it("size / className を反映する", () => {
		const { container } = render(<RabbitMark size={48} className="text-suzuka-500" />);
		const svg = container.querySelector("svg");
		expect(svg).toHaveAttribute("width", "48");
		expect(svg).toHaveAttribute("height", "48");
		expect(svg).toHaveClass("text-suzuka-500");
	});

	it("単一パスのシルエットを持つ", () => {
		const { container } = render(<RabbitMark />);
		expect(container.querySelectorAll("path")).toHaveLength(1);
	});
});
