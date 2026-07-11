/**
 * @vitest-environment happy-dom
 */

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MetaPillRow } from "../meta-pill-row";

describe("MetaPillRow", () => {
	it("通常時は「これまでに N 回押されました」と尺・作成日を表示する", () => {
		render(<MetaPillRow playCount={7} durationText="3.4秒" dateText="2026/06/26" />);

		expect(screen.getByText("7")).toBeInTheDocument();
		expect(screen.getByText(/回押されました/)).toBeInTheDocument();
		expect(screen.getByText("3.4秒")).toBeInTheDocument();
		expect(screen.getByText("2026/06/26 作成")).toBeInTheDocument();
	});

	it("再生中は「N 回目の再生中…」に切り替わる", () => {
		render(<MetaPillRow playCount={8} durationText="3.4秒" isPlaying />);

		expect(screen.getByText(/8 回目の再生中/)).toBeInTheDocument();
		expect(screen.queryByText(/回押されました/)).not.toBeInTheDocument();
	});

	it("favoriteCount が 0 より大きいときのみ ♥ を添える", () => {
		const { rerender } = render(
			<MetaPillRow playCount={7} durationText="3.4秒" favoriteCount={0} />,
		);
		expect(screen.queryByText("0")).not.toBeInTheDocument();

		rerender(<MetaPillRow playCount={7} durationText="3.4秒" favoriteCount={5} />);
		expect(screen.getByText("5")).toBeInTheDocument();
	});

	it("作成日・作成者は空なら表示しない", () => {
		render(<MetaPillRow playCount={7} durationText="3.4秒" />);

		expect(screen.queryByText(/作成$/)).not.toBeInTheDocument();
		expect(screen.queryByText(/^by /)).not.toBeInTheDocument();
	});

	it("作成者名があれば by 付きで表示する", () => {
		render(<MetaPillRow playCount={7} durationText="3.4秒" creatorName="がこんがこん" />);

		expect(screen.getByText("by がこんがこん")).toBeInTheDocument();
	});
});
