import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MediaOgCard } from "../og-media-card";

const baseProps = {
	badgeLabel: "DLsite作品",
	title: "テストタイトル",
	titleMaxWidth: 590,
	titleFontSize: 48,
	imageDataUri: null as string | null,
	imageWidth: 420,
	imageHeight: 315,
};

describe("MediaOgCard", () => {
	it("imageDataUri が null の場合は img を描画しない", () => {
		render(<MediaOgCard {...baseProps} />);

		expect(screen.queryByRole("img")).not.toBeInTheDocument();
		expect(screen.getByText("テストタイトル")).toBeInTheDocument();
	});

	it("imageDataUri がある場合は指定サイズで img を描画する", () => {
		const { container } = render(
			<MediaOgCard {...baseProps} imageDataUri="data:image/jpeg;base64,abc" />,
		);

		// alt="" の装飾画像は role="img" として公開されないため querySelector で直接取得する
		const img = container.querySelector("img") as HTMLImageElement;
		expect(img).not.toBeNull();
		expect(img.src).toBe("data:image/jpeg;base64,abc");
		expect(img.width).toBe(420);
		expect(img.height).toBe(315);
	});

	it("secondaryLine / emphasisLine が空の場合は行自体を描画しない", () => {
		render(<MediaOgCard {...baseProps} />);

		// バッジ・タイトル・フッター文言以外に、空の行が残っていないことを確認
		expect(screen.queryByText("", { selector: "span" })).not.toBeInTheDocument();
	});

	it("secondaryLine / emphasisLine を渡すとそれぞれ描画する", () => {
		render(
			<MediaOgCard
				{...baseProps}
				secondaryLine="テストサークル"
				emphasisLine="1,320円"
				emphasisFontSize={34}
			/>,
		);

		expect(screen.getByText("テストサークル")).toBeInTheDocument();
		const emphasis = screen.getByText("1,320円");
		expect(emphasis.style.fontSize).toBe("34px");
	});

	it("emphasisFontSize 省略時はデフォルト(30px)を使う", () => {
		render(<MediaOgCard {...baseProps} emphasisLine="12:34" />);

		expect(screen.getByText("12:34").style.fontSize).toBe("30px");
	});

	it("titleMaxWidth / titleFontSize がタイトル要素に反映される", () => {
		render(<MediaOgCard {...baseProps} titleMaxWidth={536} titleFontSize={40} />);

		const title = screen.getByText("テストタイトル");
		expect(title.style.width).toBe("536px");
		expect(title.style.fontSize).toBe("40px");
	});

	it("底部にサイト名とドメインを常に描画する", () => {
		render(<MediaOgCard {...baseProps} />);

		expect(screen.getByText("すずみなくりっく！")).toBeInTheDocument();
		expect(screen.getByText("suzumina.click")).toBeInTheDocument();
	});
});
