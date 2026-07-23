import { render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ParsedWorksSearchParams } from "../../lib/parse-search-params";
import WorksList from "../works-list";

// ConfigurableList はこのテストの関心事（補正フェッチの呼び出し条件）に無関係なため、
// items をそのまま描画するだけの最小実装に差し替える
vi.mock("@suzumina.click/ui/components/custom", () => ({
	ConfigurableList: ({ items }: { items: unknown[] }) => (
		<div data-testid="configurable-list">{items.length}</div>
	),
	EmptyState: () => null,
}));

vi.mock("@/components/list/list-wrapper", () => ({
	ListWrapper: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/work/work-list-item", () => ({
	WorkListItem: () => null,
}));

const mockGetWorks = vi.fn().mockResolvedValue({ works: [], totalCount: 0 });
const mockGetPopularGenres = vi.fn().mockResolvedValue([]);
vi.mock("../../actions", () => ({
	getWorks: (...args: unknown[]) => mockGetWorks(...args),
	getPopularGenres: (...args: unknown[]) => mockGetPopularGenres(...args),
}));

let mockAgeVerification = { showR18Content: false, isLoading: false };
vi.mock("@/contexts/age-verification-context", () => ({
	useAgeVerification: () => mockAgeVerification,
}));

function makeInitialParams(
	overrides: Partial<ParsedWorksSearchParams> = {},
): ParsedWorksSearchParams {
	return {
		page: 1,
		limit: 12,
		sort: "newest",
		...overrides,
	};
}

const emptyInitialData = { works: [], totalCount: 0, hasMore: false };

describe("WorksList - R18補正フェッチ", () => {
	beforeEach(() => {
		mockGetWorks.mockClear();
		mockAgeVerification = { showR18Content: false, isLoading: false };
	});

	it("未確認/未成年の間は補正フェッチしない", async () => {
		mockAgeVerification = { showR18Content: false, isLoading: false };
		render(<WorksList initialData={emptyInitialData} initialParams={makeInitialParams()} />);

		await waitFor(() => expect(mockGetPopularGenres).toHaveBeenCalled());
		expect(mockGetWorks).not.toHaveBeenCalled();
	});

	it("verified adult かつURLにshowR18指定が無い場合、showR18:trueで補正フェッチする", async () => {
		mockAgeVerification = { showR18Content: true, isLoading: false };
		render(
			<WorksList
				initialData={emptyInitialData}
				initialParams={makeInitialParams({ showR18: undefined })}
			/>,
		);

		await waitFor(() => expect(mockGetWorks).toHaveBeenCalledTimes(1));
		expect(mockGetWorks).toHaveBeenCalledWith(expect.objectContaining({ showR18: true }));
	});

	it("verified adult でもURLに showR18=false の明示指定がある場合は補正フェッチしない", async () => {
		mockAgeVerification = { showR18Content: true, isLoading: false };
		render(
			<WorksList
				initialData={emptyInitialData}
				initialParams={makeInitialParams({ showR18: false })}
			/>,
		);

		await waitFor(() => expect(mockGetPopularGenres).toHaveBeenCalled());
		expect(mockGetWorks).not.toHaveBeenCalled();
	});

	it("verified adult でもURLに showR18=true の明示指定がある場合は補正フェッチしない（SSRが既に正しい）", async () => {
		mockAgeVerification = { showR18Content: true, isLoading: false };
		render(
			<WorksList
				initialData={emptyInitialData}
				initialParams={makeInitialParams({ showR18: true })}
			/>,
		);

		await waitFor(() => expect(mockGetPopularGenres).toHaveBeenCalled());
		expect(mockGetWorks).not.toHaveBeenCalled();
	});
});
