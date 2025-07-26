/**
 * YouTube Sync V2 Endpoint Tests
 */

import type { CloudEvent } from "@google-cloud/functions-framework";
import type { Video } from "@suzumina.click/shared-types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import firestore from "../../infrastructure/database/firestore";
import * as logger from "../../shared/logger";
import { youtubeSyncV2 } from "../youtube-sync";

// Mock Firestore
const mockFirestore = {
	collection: vi.fn(() => ({
		doc: vi.fn(() => ({
			get: vi.fn(),
			set: vi.fn(),
		})),
	})),
	batch: vi.fn(() => ({
		set: vi.fn(),
		commit: vi.fn(),
	})),
};

// Mock dependencies
vi.mock("../../infrastructure/database/firestore", () => ({
	getFirestore: vi.fn(() => mockFirestore),
	Timestamp: {
		now: vi.fn().mockReturnValue({
			seconds: 1234567890,
			nanoseconds: 0,
			toDate: () => new Date(1234567890 * 1000),
		}),
		fromDate: vi.fn().mockImplementation((date) => ({
			seconds: Math.floor(date.getTime() / 1000),
			nanoseconds: 0,
			toDate: () => date,
		})),
	},
	default: {
		get collection() {
			return mockFirestore.collection;
		},
		get batch() {
			return mockFirestore.batch;
		},
		get runTransaction() {
			return mockFirestore.runTransaction;
		},
	},
}));
vi.mock("../../shared/logger");
vi.mock("../../services/youtube/youtube-service", () => ({
	createVideoService: vi.fn(() => mockYouTubeService),
}));

// Mock YouTube service
const mockYouTubeService = {
	fetchChannelVideos: vi.fn(),
	fetchVideoById: vi.fn(),
	fetchVideosByIds: vi.fn(),
};

// Mock CloudEvent
const createMockCloudEvent = (): CloudEvent<unknown> => ({
	type: "google.pubsub.topic.publish",
	source: "test",
	subject: "test",
	id: "test-id",
	time: new Date().toISOString(),
	specversion: "1.0",
	data: {},
});

describe("YouTube Sync V2 Endpoint", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		process.env.SUZUKA_MINASE_CHANNEL_ID = "test-channel-id";
	});

	afterEach(() => {
		delete process.env.SUZUKA_MINASE_CHANNEL_ID;
	});

	it("should successfully sync videos on first run", async () => {
		// Mock metadata (no existing metadata)
		const mockGet = vi.fn().mockResolvedValue({ exists: false });
		const mockSet = vi.fn().mockResolvedValue(undefined);
		mockFirestore.collection.mockReturnValue({
			doc: vi.fn().mockReturnValue({
				get: mockGet,
				set: mockSet,
			}),
		});

		// Mock video data
		const mockVideo1 = createMockVideo("video1");
		const mockVideo2 = createMockVideo("video2");
		mockYouTubeService.fetchChannelVideos.mockResolvedValue({
			videos: [mockVideo1, mockVideo2],
			nextPageToken: undefined,
		});

		// Mock batch operations
		const mockBatchSet = vi.fn();
		const mockBatchCommit = vi.fn().mockResolvedValue(undefined);
		mockFirestore.batch.mockReturnValue({
			set: mockBatchSet,
			commit: mockBatchCommit,
		});

		// Execute
		const event = createMockCloudEvent();
		await youtubeSyncV2(event);

		// Verify YouTube service was called
		expect(mockYouTubeService.fetchChannelVideos).toHaveBeenCalledWith(
			"test-channel-id",
			50,
			undefined,
		);

		// Verify batch operations
		expect(mockFirestore.batch).toHaveBeenCalled();
		expect(mockBatchSet).toHaveBeenCalledTimes(2);
		expect(mockBatchCommit).toHaveBeenCalled();

		// Verify metadata updates
		expect(mockSet).toHaveBeenCalledWith(
			expect.objectContaining({
				isInProgress: false,
				version: "v2",
			}),
			{ merge: true },
		);

		// Verify logging
		expect(logger.info).toHaveBeenCalledWith(
			expect.stringContaining("YouTube同期V2が完了しました"),
			expect.objectContaining({
				videoCount: 2,
				migratedCount: 2,
			}),
		);
	});

	it("should continue from next page token", async () => {
		// Mock existing metadata with nextPageToken
		const mockGet = vi.fn().mockResolvedValue({
			exists: true,
			data: () => ({
				nextPageToken: "existing-token",
				isInProgress: false,
				version: "v2",
			}),
		});
		const mockSet = vi.fn().mockResolvedValue(undefined);
		mockFirestore.collection.mockReturnValue({
			doc: vi.fn().mockReturnValue({
				get: mockGet,
				set: mockSet,
			}),
		});

		// Mock video data with next page
		const mockVideo = createMockVideo("video1");
		mockYouTubeService.fetchChannelVideos.mockResolvedValue({
			videos: [mockVideo],
			nextPageToken: "new-token",
		});

		// Mock batch operations
		mockFirestore.batch.mockReturnValue({
			set: vi.fn(),
			commit: vi.fn().mockResolvedValue(undefined),
		});

		// Execute
		const event = createMockCloudEvent();
		await youtubeSyncV2(event);

		// Verify YouTube service was called with existing token
		expect(mockYouTubeService.fetchChannelVideos).toHaveBeenCalledWith(
			"test-channel-id",
			50,
			"existing-token",
		);

		// Verify metadata was updated with new token
		expect(mockSet).toHaveBeenCalledWith(
			expect.objectContaining({
				nextPageToken: "new-token",
			}),
			{ merge: true },
		);
	});

	it("should skip if another instance is running", async () => {
		// Mock metadata showing in progress
		const mockGet = vi.fn().mockResolvedValue({
			exists: true,
			data: () => ({
				isInProgress: true,
				version: "v2",
			}),
		});
		mockFirestore.collection.mockReturnValue({
			doc: vi.fn().mockReturnValue({
				get: mockGet,
			}),
		});

		// Execute
		const event = createMockCloudEvent();
		await youtubeSyncV2(event);

		// Verify YouTube service was not called
		expect(mockYouTubeService.fetchChannelVideos).not.toHaveBeenCalled();

		// Verify warning was logged
		expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining("別のインスタンスが実行中"));
	});

	it("should handle errors gracefully", async () => {
		// Mock metadata
		const mockGet = vi.fn().mockResolvedValue({ exists: false });
		const mockSet = vi.fn().mockResolvedValue(undefined);
		mockFirestore.collection.mockReturnValue({
			doc: vi.fn().mockReturnValue({
				get: mockGet,
				set: mockSet,
			}),
		});

		// Mock YouTube service error
		const error = new Error("YouTube API error");
		mockYouTubeService.fetchChannelVideos.mockRejectedValue(error);

		// Execute and expect error
		const event = createMockCloudEvent();
		await expect(youtubeSyncV2(event)).rejects.toThrow("YouTube API error");

		// Verify error metadata was saved
		expect(mockSet).toHaveBeenCalledWith(
			expect.objectContaining({
				isInProgress: false,
				lastError: "YouTube API error",
			}),
			{ merge: true },
		);
	});

	it("should throw error if channel ID is not set", async () => {
		// Remove channel ID
		delete process.env.SUZUKA_MINASE_CHANNEL_ID;

		// Execute and expect error
		const event = createMockCloudEvent();
		await expect(youtubeSyncV2(event)).rejects.toThrow("チャンネルIDが設定されていません");
	});
});

/**
 * Helper function to create mock Video
 */
function createMockVideo(id: string): Video {
	return {
		id,
		metadata: {
			title: { value: `Test Video ${id}` },
			description: { value: "Test description" },
		},
		channel: {
			id: { value: "test-channel" },
			title: { value: "Test Channel" },
		},
		content: {
			id: { value: id },
			publishedAt: { value: new Date() },
		},
		statistics: {
			viewCount: { value: 100 },
			likeCount: { value: 10 },
			commentCount: { value: 5 },
		},
		toLegacyFormat: vi.fn().mockReturnValue({
			id,
			videoId: id,
			title: `Test Video ${id}`,
			description: "Test description",
			channelId: "test-channel",
			channelTitle: "Test Channel",
			publishedAt: new Date().toISOString(),
			statistics: {
				viewCount: 100,
				likeCount: 10,
				commentCount: 5,
			},
		}),
	} as unknown as Video;
}
