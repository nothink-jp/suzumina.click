// Storybookのモック関数ユーティリティ
import type {
  PaginationParams,
  Video,
  VideoListResult,
} from "../src/lib/videos/types";

// グローバル型宣言を追加
declare global {
  interface Window {
    __nextjs_navigation_mock?: {
      useRouter(): Record<string, unknown>;
      usePathname(): string;
      useSearchParams(): URLSearchParams;
    };
    // VideoListコンポーネントのAPIモック
    getRecentVideosStorybook?: (
      params?: PaginationParams,
    ) => Promise<VideoListResult>;
    originalGetRecentVideos?: (
      params?: PaginationParams,
    ) => Promise<VideoListResult>;
  }
}

// モック関数の型定義
export type MockFn<T = void, R = unknown> = {
  (...args: T[]): R;
  calls: T[][];
  returnValue: R | null;
  implementation?: (...args: T[]) => R;
  mockImplementation: (impl: (...args: T[]) => R) => MockFn<T, R>;
};

/**
 * モック関数を作成するヘルパー関数
 * @param returnValue - 返却値の初期値
 * @returns モック関数
 */
export const createMockFn = <T = void, R = unknown>(
  returnValue?: R,
): MockFn<T, R> => {
  // 型安全なモック関数を作成
  const mockFn = ((...args: T[]) => {
    mockFn.calls.push(args);
    return mockFn.implementation
      ? mockFn.implementation(...args)
      : (mockFn.returnValue as R);
  }) as MockFn<T, R>;

  // プロパティを初期化
  mockFn.calls = [];
  mockFn.returnValue = returnValue ?? null;
  mockFn.implementation = undefined;

  // メソッドを定義
  mockFn.mockImplementation = (impl: (...args: T[]) => R) => {
    mockFn.implementation = impl;
    return mockFn;
  };

  return mockFn;
};

// Next.jsのモック関数の準備
export const mockRouter = {
  push: createMockFn<string, void>(),
  replace: createMockFn<string, void>(),
  prefetch: createMockFn<string, void>(),
  back: createMockFn<void, void>(),
  forward: createMockFn<void, void>(),
  refresh: createMockFn<void, void>(),
};

// Next.jsのナビゲーションモックを初期化する関数
export const initNextJsNavigationMock = (): void => {
  // next/navigationにモックを割り当て
  window.__nextjs_navigation_mock = {
    useRouter: () => mockRouter,
    usePathname: () => "/",
    useSearchParams: () => new URLSearchParams(),
  };
};

// VideoListコンポーネントのAPIモックを初期化する関数
export interface VideoListMockData {
  videos?: Video[];
  hasMore?: boolean;
  loading?: boolean;
}

export const initVideoListApiMock = (mockData: VideoListMockData): void => {
  // APIモックを設定
  window.getRecentVideosStorybook = async () => {
    if (mockData.loading) {
      // ローディング状態をシミュレート
      return new Promise(() => {});
    }

    return {
      videos: mockData.videos || [],
      hasMore: mockData.hasMore || false,
      lastVideo:
        mockData.videos && mockData.videos.length > 0
          ? mockData.videos[mockData.videos.length - 1]
          : undefined,
    };
  };
};
