import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { FilterControl } from "../configurable-list-filters";
import type { FilterConfig } from "../types";

describe("TagsFilter（FilterControl type=tags）", () => {
	const manyOptions = Array.from({ length: 30 }, (_, i) => ({
		value: `tag-${i}`,
		label: `タグ${i}`,
	}));

	const config: FilterConfig = {
		type: "tags",
		label: "ジャンル",
		options: manyOptions,
	};

	it("検索語で未選択の候補を絞り込む", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();
		render(
			<FilterControl keyName="genres" value={undefined} config={config} onChange={onChange} />,
		);

		await user.click(screen.getByRole("button", { name: /ジャンル/ }));
		const search = await screen.findByPlaceholderText("検索...");
		expect(screen.getByText("タグ0")).toBeInTheDocument();
		expect(screen.getByText("タグ15")).toBeInTheDocument();

		await user.type(search, "タグ15");

		await waitFor(() => {
			expect(screen.queryByText("タグ0")).not.toBeInTheDocument();
		});
		expect(screen.getByText("タグ15")).toBeInTheDocument();
	});

	it("検索に一致する候補が無い場合は案内文を表示する", async () => {
		const user = userEvent.setup();
		render(<FilterControl keyName="genres" value={undefined} config={config} onChange={vi.fn()} />);

		await user.click(screen.getByRole("button", { name: /ジャンル/ }));
		const search = await screen.findByPlaceholderText("検索...");
		await user.type(search, "存在しないタグ");

		await waitFor(() => {
			expect(screen.getByText("該当するタグがありません")).toBeInTheDocument();
		});
	});

	it("選択済みの候補は検索語に一致しなくても先頭に表示され続ける", async () => {
		const user = userEvent.setup();
		render(
			<FilterControl keyName="genres" value={["tag-20"]} config={config} onChange={vi.fn()} />,
		);

		await user.click(screen.getByRole("button", { name: /ジャンル/ }));
		const search = await screen.findByPlaceholderText("検索...");
		// トリガー側にも選択中バッジ「タグ20」が出るため、以降はポップアップ本体に限定してクエリする
		const popup = within(search.closest('[data-slot="popover-content"]') as HTMLElement);
		await user.type(search, "タグ1");

		// 検索語「タグ1」に一致しない tag-20（選択済み）もピン留めされて残る
		await waitFor(() => {
			expect(popup.getByText("タグ20")).toBeInTheDocument();
		});
		// 検索語に一致する未選択候補（タグ1, タグ10-19）は表示される
		expect(popup.getByText("タグ1")).toBeInTheDocument();
		// 検索語に一致しない未選択候補は除外される
		expect(popup.queryByText("タグ2")).not.toBeInTheDocument();
	});

	it("チェックボックスの選択/解除で onChange が呼ばれる", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();
		render(
			<FilterControl keyName="genres" value={undefined} config={config} onChange={onChange} />,
		);

		await user.click(screen.getByRole("button", { name: /ジャンル/ }));
		await screen.findByPlaceholderText("検索...");
		await user.click(screen.getByText("タグ0"));

		expect(onChange).toHaveBeenCalledWith(["tag-0"]);
	});
});
