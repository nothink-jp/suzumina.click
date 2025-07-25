import { describe, expect, it, vi } from "vitest";

// Mocks
vi.mock("../../../shared/logger", () => ({
	info: vi.fn(),
	warn: vi.fn(),
	error: vi.fn(),
	debug: vi.fn(),
}));

vi.mock("../../config/feature-flags", () => ({
	isEntityV2Enabled: vi.fn(() => false), // デフォルトは無効
}));

vi.mock("../../../infrastructure/database/firestore", () => ({
	default: {
		collection: vi.fn(() => ({
			doc: vi.fn(() => ({
				get: vi.fn().mockResolvedValue({ exists: false }),
				set: vi.fn().mockResolvedValue(undefined),
				update: vi.fn().mockResolvedValue(undefined),
			})),
		})),
		batch: vi.fn(() => ({
			set: vi.fn(),
			commit: vi.fn().mockResolvedValue(undefined),
		})),
	},
	Timestamp: {
		now: vi.fn().mockReturnValue({ seconds: 1234567890, nanoseconds: 0 }),
	},
}));

vi.mock("googleapis", () => ({
	google: {
		youtube: vi.fn(() => ({
			search: {
				list: vi.fn().mockResolvedValue({ data: { items: [] } }),
			},
			videos: {
				list: vi.fn().mockResolvedValue({ data: { items: [] } }),
			},
		})),
	},
}));

import { fetchYouTubeVideos } from "../youtube";

describe("fetchYouTubeVideos", () => {
	it("should be exported as a function", () => {
		expect(fetchYouTubeVideos).toBeDefined();
		expect(typeof fetchYouTubeVideos).toBe("function");
	});
});
