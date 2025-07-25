/**
 * Feature Flags Frontend Tests
 */

import type { FeatureFlagContext, FeatureFlags } from "@suzumina.click/shared-types";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	evaluateFeatureFlag,
	reportFeatureFlagError,
	reportFeatureFlagMetrics,
} from "../feature-flags";

describe("Feature Flags Frontend", () => {
	let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
	let consoleLogSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
		consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
	});

	afterEach(() => {
		consoleErrorSpy.mockRestore();
		consoleLogSpy.mockRestore();
	});

	describe("evaluateFeatureFlag", () => {
		const baseContext: FeatureFlagContext = {
			sessionId: "test-session",
			environment: "development",
		};

		const baseFlags: FeatureFlags = {
			entityV2: {
				video: true,
				audioButton: true,
				mode: "enabled",
				rollout: {
					percentage: 50,
					whitelist: [],
					blacklist: [],
				},
			},
			monitoring: {
				collectMetrics: true,
				autoRollback: true,
				errorThreshold: 5,
			},
		};

		it("should return disabled when mode is disabled", () => {
			const flags: FeatureFlags = {
				...baseFlags,
				entityV2: {
					...baseFlags.entityV2,
					mode: "disabled",
				},
			};

			const result = evaluateFeatureFlag(flags, "video", baseContext);
			expect(result.enabled).toBe(false);
			expect(result.reason).toBe("disabled");
		});

		it("should return disabled when feature flag is false", () => {
			const flags: FeatureFlags = {
				...baseFlags,
				entityV2: {
					...baseFlags.entityV2,
					video: false,
				},
			};

			const result = evaluateFeatureFlag(flags, "video", baseContext);
			expect(result.enabled).toBe(false);
			expect(result.reason).toBe("disabled");
		});

		it("should respect blacklist", () => {
			const flags: FeatureFlags = {
				...baseFlags,
				entityV2: {
					...baseFlags.entityV2,
					rollout: {
						...baseFlags.entityV2.rollout,
						blacklist: ["user123"],
					},
				},
			};

			const context: FeatureFlagContext = {
				...baseContext,
				userId: "user123",
			};

			const result = evaluateFeatureFlag(flags, "video", context);
			expect(result.enabled).toBe(false);
			expect(result.reason).toBe("blacklist");
		});

		it("should respect whitelist", () => {
			const flags: FeatureFlags = {
				...baseFlags,
				entityV2: {
					...baseFlags.entityV2,
					rollout: {
						...baseFlags.entityV2.rollout,
						percentage: 0, // 0%でもホワイトリストは有効
						whitelist: ["user456"],
					},
				},
			};

			const context: FeatureFlagContext = {
				...baseContext,
				userId: "user456",
			};

			const result = evaluateFeatureFlag(flags, "audioButton", context);
			expect(result.enabled).toBe(true);
			expect(result.reason).toBe("whitelist");
		});

		it("should evaluate percentage rollout", () => {
			const flags: FeatureFlags = {
				...baseFlags,
				entityV2: {
					...baseFlags.entityV2,
					rollout: {
						...baseFlags.entityV2.rollout,
						percentage: 100, // 100%有効
					},
				},
			};

			const result = evaluateFeatureFlag(flags, "video", baseContext);
			expect(result.enabled).toBe(true);
			expect(result.reason).toBe("percentage");
		});

		it("should include debug info when requested", () => {
			const context: FeatureFlagContext = {
				...baseContext,
				debug: true,
			};

			const result = evaluateFeatureFlag(baseFlags, "video", context);
			expect(result.debug).toBeDefined();
			expect(result.debug?.context).toEqual(context);
			expect(result.debug?.flags).toEqual(baseFlags);
			expect(typeof result.debug?.evaluationTime).toBe("number");
		});
	});

	describe("reportFeatureFlagError", () => {
		it("should log errors to console", () => {
			const error = new Error("Test error");
			reportFeatureFlagError("video", error);

			expect(consoleErrorSpy).toHaveBeenCalledWith("Feature flag error for video:", error);
		});
	});

	describe("reportFeatureFlagMetrics", () => {
		it("should log metrics in development", () => {
			const originalEnv = process.env.NODE_ENV;
			process.env.NODE_ENV = "development";

			const metrics = {
				loadTime: 100,
				renderTime: 50,
				errorCount: 0,
			};

			reportFeatureFlagMetrics("audioButton", metrics);

			expect(consoleLogSpy).toHaveBeenCalledWith("Feature flag metrics for audioButton:", metrics);

			process.env.NODE_ENV = originalEnv;
		});

		it("should not log metrics in production", () => {
			const originalEnv = process.env.NODE_ENV;
			process.env.NODE_ENV = "production";

			reportFeatureFlagMetrics("video", { loadTime: 100 });

			expect(consoleLogSpy).not.toHaveBeenCalled();

			process.env.NODE_ENV = originalEnv;
		});
	});

	describe("Hash function stability", () => {
		it("should produce consistent hash for same input", () => {
			const baseContext: FeatureFlagContext = {
				sessionId: "test-session",
				environment: "development",
			};

			const flags: FeatureFlags = {
				entityV2: {
					video: true,
					audioButton: true,
					mode: "enabled",
					rollout: {
						percentage: 50,
						whitelist: [],
						blacklist: [],
					},
				},
				monitoring: {
					collectMetrics: true,
					autoRollback: true,
					errorThreshold: 5,
				},
			};

			// ハッシュ関数のテスト（内部実装のテスト）
			const testCases = [
				"session1",
				"session2",
				"very-long-session-id-with-many-characters",
				"123456789",
			];

			testCases.forEach((sessionId) => {
				const context1 = { ...baseContext, sessionId };
				const context2 = { ...baseContext, sessionId };

				const result1 = evaluateFeatureFlag(flags, "video", context1);
				const result2 = evaluateFeatureFlag(flags, "video", context2);

				expect(result1.enabled).toBe(result2.enabled);
			});
		});
	});
});
