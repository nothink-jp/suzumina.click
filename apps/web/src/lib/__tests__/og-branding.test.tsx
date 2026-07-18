import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { OgBadge, OgFooter } from "../og-branding";

describe("OgBadge", () => {
	it("ラベルを統一スタイル（25px・ピル形状）で描画する", () => {
		render(<OgBadge label="音声ボタン" />);

		const badge = screen.getByText("音声ボタン");
		expect(badge.style.fontSize).toBe("25px");
		expect(badge.style.borderRadius).toBe("9999px");
	});

	it("style で配置指定を上書きできる", () => {
		render(<OgBadge label="DLsite作品" style={{ alignSelf: "flex-start" }} />);

		expect(screen.getByText("DLsite作品").style.alignSelf).toBe("flex-start");
	});
});

describe("OgFooter", () => {
	it("通常時はサイト名とドメインを描画する", () => {
		render(<OgFooter />);

		expect(screen.getByText("すずみなくりっく！")).toBeInTheDocument();
		expect(screen.getByText("suzumina.click")).toBeInTheDocument();
	});

	it("ascii 時は日本語サイト名を出さずドメインのみ描画する（tofu 化回避）", () => {
		render(<OgFooter ascii />);

		expect(screen.queryByText("すずみなくりっく！")).not.toBeInTheDocument();
		expect(screen.getByText("suzumina.click")).toBeInTheDocument();
	});
});
