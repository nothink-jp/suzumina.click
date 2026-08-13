import { render, screen, within } from "@testing-library/react";
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

// 同じページ番号のリンクはページ送りと「ページを選んで移動」の両方に出るため、
// どちらを見ているかを明示してから引く
const inPagination = () => within(screen.getByRole("navigation", { name: "pagination" }));
const hrefOf = (name: string | RegExp) =>
	inPagination().getByRole("link", { name }).getAttribute("href");

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
		await user.click(inPagination().getByRole("link", { name: "4" }));
		expect(onPageChange).toHaveBeenCalledWith(4);
	});
});

// ページ送りは末端まで 45 ホップ必要（181ページ実測）で、クローラが深いページを
// 発見できない。全ページのリンクを別に置いて 1 ホップにするのが狙い（SPR-308 ③）。
describe("ConfigurableListPagination: ページを選んで移動", () => {
	const jumpList = () => screen.queryByRole("group"); // <details>

	const jumpLinks = () =>
		within(screen.getByRole("group"))
			.getAllByRole("link")
			.map((link) => link.textContent?.trim());

	it("全ページへのリンクを持つ（どのページからでも 1 ホップで到達できる）", () => {
		renderPagination({ currentPage: 10, totalPages: 33 });
		const links = jumpLinks();
		expect(links).toHaveLength(33);
		expect(links[0]).toBe("1");
		expect(links.at(-1)).toBe("33");
	});

	it("リンクは実 URL を持つ", () => {
		renderPagination({ currentPage: 10, totalPages: 33 });
		const link = within(screen.getByRole("group")).getByRole("link", { name: "27" });
		expect(link.getAttribute("href")).toBe("/works?page=27");
	});

	it("ページ送りに全ページが出ているときは表示しない（同じリンクの二重掲載を避ける）", () => {
		renderPagination({ currentPage: 1, totalPages: 7 });
		expect(jumpList()).not.toBeInTheDocument();
	});

	it("ページ送りの番号列は従来どおり（飛びのある番号にしない）", () => {
		renderPagination({ currentPage: 10, totalPages: 33 });
		const numbers = inPagination()
			.getAllByRole("link")
			.map((link) => link.textContent?.trim() ?? "")
			.filter((label) => /^\d+$/.test(label));
		expect(numbers).toEqual(["1", "8", "9", "10", "11", "12", "33"]);
	});
});
