/**
 * テスト用のプロバイダーとユーティリティ
 */

import type { RenderOptions } from "@testing-library/react";
import { render } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import type { Mock } from "vitest";
import { vi } from "vitest";

// Next.js のモック
export const mockRouter: {
	push: Mock;
	replace: Mock;
	back: Mock;
	forward: Mock;
	refresh: Mock;
	prefetch: Mock;
	pathname: string;
} = {
	push: vi.fn(),
	replace: vi.fn(),
	back: vi.fn(),
	forward: vi.fn(),
	refresh: vi.fn(),
	prefetch: vi.fn(),
	pathname: "/test",
};

export const mockSearchParams = new URLSearchParams();

// Next.js hooks のモック設定
vi.mock("next/navigation", () => ({
	useRouter: () => mockRouter,
	useSearchParams: () => mockSearchParams,
	usePathname: () => "/test",
}));

// テスト用のプロバイダー
interface TestProvidersProps {
	children: ReactNode;
}

export function TestProviders({ children }: TestProvidersProps) {
	// 必要に応じて他のプロバイダーを追加
	return <>{children}</>;
}

// カスタムレンダラー
export function renderWithProviders(
	ui: ReactElement,
	options?: Omit<RenderOptions, "wrapper">,
): ReturnType<typeof render> {
	return render(ui, {
		wrapper: TestProviders,
		...options,
	});
}

// テスト用のデータ生成ヘルパー
export function createMockListItem<T extends { id: string | number }>(
	id: string | number,
	overrides?: Partial<T>,
): T {
	return {
		id,
		...overrides,
	} as T;
}

// 非同期処理のヘルパー
export async function waitForDataToLoad() {
	const { waitFor } = await import("@testing-library/react");
	await waitFor(() => {
		// データローディングの完了を待つ共通ロジック
	});
}

// モックデータファクトリー
export const mockDataFactory = {
	createItems: <T,>(count: number, creator: (index: number) => T): T[] => {
		return Array.from({ length: count }, (_, i) => creator(i));
	},

	createPaginatedResponse: <T,>(
		items: T[],
		page = 1,
		limit = 10,
	): { items: T[]; totalCount: number; filteredCount: number } => {
		const start = (page - 1) * limit;
		const paginatedItems = items.slice(start, start + limit);
		return {
			items: paginatedItems,
			totalCount: items.length,
			filteredCount: items.length,
		};
	},
};
