/**
 * 共有テストユーティリティ
 * 重複するテストパターンを統合し、メンテナンス性を向上
 */

import { expect, vi } from "vitest";

/**
 * プロパティ組み合わせテスト
 * 個別にテストする代わりにパラメータ化
 */
export const testPropCombinations = (propCombinations: Array<{ name: string; props: unknown }>) => {
	return propCombinations.map(({ name, props }) => [name, props]);
};

/**
 * モックファクトリー - Firestore
 */
export const createMockFirestore = () => ({
	collection: vi.fn(() => ({
		doc: vi.fn(() => ({
			get: vi.fn(() => Promise.resolve({ exists: true, data: () => ({}) })),
			set: vi.fn(() => Promise.resolve()),
			update: vi.fn(() => Promise.resolve()),
			delete: vi.fn(() => Promise.resolve()),
		})),
		where: vi.fn(() => ({
			get: vi.fn(() => Promise.resolve({ docs: [] })),
			orderBy: vi.fn(() => ({
				limit: vi.fn(() => ({
					get: vi.fn(() => Promise.resolve({ docs: [] })),
				})),
			})),
		})),
		add: vi.fn(() => Promise.resolve({ id: "mock-id" })),
	})),
});

/**
 * モックファクトリー - 音声ボタンデータ
 */
export const createMockAudioButton = (overrides = {}) => ({
	id: "mock-audio-button-id",
	title: "テスト音声ボタン",
	sourceVideoId: "test-video-id",
	startTime: 60,
	endTime: 90,
	category: "voice",
	isPublic: true,
	playCount: 10,
	likeCount: 5,
	createdAt: "2023-01-01T00:00:00Z",
	...overrides,
});

/**
 * モックファクトリー - 動画データ
 */
export const createMockVideo = (overrides = {}) => ({
	id: "mock-video-id",
	videoId: "test-video-id",
	title: "テスト動画",
	description: "テスト動画の説明",
	channelId: "test-channel-id",
	channelTitle: "テストチャンネル",
	publishedAt: "2023-01-01T00:00:00Z",
	thumbnailUrl: "https://example.com/thumbnail.jpg",
	lastFetchedAt: "2023-01-01T00:00:00Z",
	...overrides,
});

/**
 * エラーハンドリング統合テスト
 */
export const testErrorHandling = (
	actionFn: () => Promise<unknown>,
	expectedErrorMessage: string,
) => {
	return async () => {
		const result = await actionFn();
		expect(result).toEqual({
			success: false,
			error: expectedErrorMessage,
		});
	};
};
