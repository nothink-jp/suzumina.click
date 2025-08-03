/**
 * テスト用の型定義
 */

import type { Mock } from "vitest";

// モック関数の型
export type MockFunction<T extends (...args: any[]) => any> = Mock<T>;

// テスト用のジェネリック型
export interface TestItem {
	id: string;
	name: string;
	[key: string]: unknown;
}

// リスト系コンポーネントのテスト用Props
export interface TestListProps<T = TestItem> {
	items: T[];
	renderItem: (item: T) => React.ReactNode;
	onItemClick?: (item: T) => void;
	loading?: boolean;
	error?: Error | null;
}

// フェッチ関数のモック型
export type MockFetchFunction<T = unknown> = Mock<
	(params: any) => Promise<{
		items: T[];
		totalCount: number;
		filteredCount: number;
	}>
>;

// Next.js Router のモック型
export interface MockNextRouter {
	push: Mock<(url: string) => Promise<boolean>>;
	replace: Mock<(url: string) => Promise<boolean>>;
	back: Mock<() => void>;
	forward: Mock<() => void>;
	refresh: Mock<() => void>;
	prefetch: Mock<(url: string) => Promise<void>>;
	pathname: string;
}
