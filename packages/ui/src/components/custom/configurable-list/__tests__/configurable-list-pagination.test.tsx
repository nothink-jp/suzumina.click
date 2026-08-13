import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ConfigurableListPagination } from "../configurable-list-pagination";

// ページ送りが実 URL の <a href> であることが要件（SPR-308）。
// href が `#` だとクローラは2ページ目以降へ到達できず、詳細ページが発見されない。
const getPageHref = (page: number) => (page === 1 ? "/works" : `/works?page=${page}`);

const renderPagination = (props: Partial<Parameters<typeof ConfigurableListPagination>[0]> = {}) =>
	render(
		<ConfigurableListPagination
			currentPage={3}
			totalPages={10}
			hasPrev={true}
			hasNext={true}
			onPageChange={vi.fn()}
			getPageHref={getPageHref}
			{...props}
		/>,
	);

const hrefOf = (name: string | RegExp) => screen.getByRole("link", { name }).getAttribute("href");

describe("ConfigurableListPagination: href", () => {
	it("ページ番号リンクが実 URL を持つ", () => {
		renderPagination();
		expect(hrefOf("4")).toBe("/works?page=4");
		expect(hrefOf("1")).toBe("/works");
	});

	it("前へ・次へが隣接ページを指す", () => {
		renderPagination();
		expect(hrefOf(/previous/i)).toBe("/works?page=2");
		expect(hrefOf(/next/i)).toBe("/works?page=4");
	});

	it("先頭・末尾では無効側を page=0 や範囲外に向けない", () => {
		renderPagination({ currentPage: 1, hasPrev: false });
		expect(hrefOf(/previous/i)).toBe("#");
	});

	it("getPageHref 未指定（urlSync=false）では従来どおり # のまま", () => {
		renderPagination({ getPageHref: undefined });
		expect(hrefOf("4")).toBe("#");
		expect(hrefOf(/next/i)).toBe("#");
	});

	it("クリックは href の遷移ではなく onPageChange で処理する", async () => {
		const user = userEvent.setup();
		const onPageChange = vi.fn();
		renderPagination({ onPageChange });
		await user.click(screen.getByRole("link", { name: "4" }));
		expect(onPageChange).toHaveBeenCalledWith(4);
	});
});

// 省略記号を中間ページへのリンクに置き換えた結果（SPR-308 ③）。
// 見た目は飛びのある番号列になり、飛ぶ先はすべて実 URL のリンク。
describe("ConfigurableListPagination: 番号列", () => {
	const renderedNumbers = () =>
		screen
			.getAllByRole("link")
			.map((link) => link.textContent?.trim() ?? "")
			.filter((label) => /^\d+$/.test(label));

	it("多ページでは飛びのある番号列を描画し、すべてリンクになっている", () => {
		renderPagination({ currentPage: 10, totalPages: 33 });
		expect(renderedNumbers()).toEqual(["1", "4", "8", "9", "10", "11", "12", "23", "33"]);
		expect(hrefOf("4")).toBe("/works?page=4");
		expect(hrefOf("23")).toBe("/works?page=23");
	});

	it("窓に収まるページ数なら従来どおり連番", () => {
		renderPagination({ currentPage: 2, totalPages: 4 });
		expect(renderedNumbers()).toEqual(["1", "2", "3", "4"]);
	});
});
