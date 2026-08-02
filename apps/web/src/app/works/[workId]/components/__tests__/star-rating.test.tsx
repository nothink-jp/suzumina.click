import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StarRating } from "../star-rating";

/** 星ごとの塗り幅クラス（w-0 / w-1/2 / w-full）を左から順に取り出す */
function fillWidths(container: HTMLElement): string[] {
	return Array.from(container.querySelectorAll(".absolute")).map((el) => {
		if (el.classList.contains("w-full")) return "full";
		if (el.classList.contains("w-1/2")) return "half";
		return "none";
	});
}

describe("StarRating", () => {
	it("満点は5つとも塗る（0-5 スケールをそのまま解釈する）", () => {
		const { container } = render(<StarRating rating={5} />);

		expect(fillWidths(container)).toEqual(["full", "full", "full", "full", "full"]);
		expect(screen.getByRole("img")).toHaveAttribute("aria-label", "5段階評価で5.0");
	});

	it("読み上げは丸めない実値を伝える（表示の数値と一致させる）", () => {
		render(<StarRating rating={4.3} />);

		expect(screen.getByRole("img")).toHaveAttribute("aria-label", "5段階評価で4.3");
	});

	it("半端な評価は半分だけ塗った星で表す", () => {
		const { container } = render(<StarRating rating={4.5} />);

		expect(fillWidths(container)).toEqual(["full", "full", "full", "full", "half"]);
	});

	it("0.5 刻みに丸める", () => {
		const { container: down } = render(<StarRating rating={4.1} />);
		expect(fillWidths(down)).toEqual(["full", "full", "full", "full", "none"]);

		const { container: up } = render(<StarRating rating={4.3} />);
		expect(fillWidths(up)).toEqual(["full", "full", "full", "full", "half"]);
	});

	it("評価0は1つも塗らない", () => {
		const { container } = render(<StarRating rating={0} />);

		expect(fillWidths(container)).toEqual(["none", "none", "none", "none", "none"]);
	});

	it("範囲外の値は 0-5 にクランプする", () => {
		const { container: over } = render(<StarRating rating={50} />);
		expect(fillWidths(over)).toEqual(["full", "full", "full", "full", "full"]);

		const { container: under } = render(<StarRating rating={-1} />);
		expect(fillWidths(under)).toEqual(["none", "none", "none", "none", "none"]);
	});
});
