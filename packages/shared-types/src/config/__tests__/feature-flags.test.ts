/**
 * Feature Flags Type Tests
 */

import { describe, expect, it } from "vitest";
import type { FeatureFlagContext, FeatureFlagEvaluation, FeatureFlags } from "../feature-flags";
import { defaultFeatureFlags } from "../feature-flags";

describe("Feature Flags Types", () => {
	describe("FeatureFlags", () => {
		it("should have correct structure", () => {
			const flags: FeatureFlags = {
				entityV2: {
					video: true,
					audioButton: false,
					mode: "enabled",
					rollout: {
						percentage: 50,
						whitelist: ["user1"],
						blacklist: ["user2"],
					},
				},
				monitoring: {
					collectMetrics: true,
					autoRollback: true,
					errorThreshold: 5,
				},
			};

			expect(flags.entityV2.video).toBe(true);
			expect(flags.entityV2.audioButton).toBe(false);
			expect(flags.entityV2.mode).toBe("enabled");
			expect(flags.entityV2.rollout.percentage).toBe(50);
			expect(flags.monitoring.errorThreshold).toBe(5);
		});

		it("should accept different modes", () => {
			const modes: Array<FeatureFlags["entityV2"]["mode"]> = ["disabled", "readonly", "enabled"];

			modes.forEach((mode) => {
				const flags: FeatureFlags = {
					...defaultFeatureFlags,
					entityV2: {
						...defaultFeatureFlags.entityV2,
						mode,
					},
				};
				expect(flags.entityV2.mode).toBe(mode);
			});
		});
	});

	describe("defaultFeatureFlags", () => {
		it("should have safe defaults", () => {
			expect(defaultFeatureFlags.entityV2.video).toBe(false);
			expect(defaultFeatureFlags.entityV2.audioButton).toBe(false);
			expect(defaultFeatureFlags.entityV2.mode).toBe("disabled");
			expect(defaultFeatureFlags.entityV2.rollout.percentage).toBe(0);
			expect(defaultFeatureFlags.entityV2.rollout.whitelist).toEqual([]);
			expect(defaultFeatureFlags.entityV2.rollout.blacklist).toEqual([]);
			expect(defaultFeatureFlags.monitoring.collectMetrics).toBe(true);
			expect(defaultFeatureFlags.monitoring.autoRollback).toBe(true);
			expect(defaultFeatureFlags.monitoring.errorThreshold).toBe(5);
		});
	});

	describe("FeatureFlagContext", () => {
		it("should accept valid contexts", () => {
			const contexts: FeatureFlagContext[] = [
				{
					userId: "user123",
					sessionId: "session123",
					environment: "development",
					debug: true,
				},
				{
					sessionId: "session456",
					environment: "production",
				},
				{
					userId: undefined,
					sessionId: "session789",
					environment: "staging",
					debug: false,
				},
			];

			contexts.forEach((context) => {
				expect(context.sessionId).toBeTruthy();
				expect(["development", "staging", "production"]).toContain(context.environment);
			});
		});
	});

	describe("FeatureFlagEvaluation", () => {
		it("should have all required fields", () => {
			const evaluations: FeatureFlagEvaluation[] = [
				{
					enabled: true,
					reason: "whitelist",
				},
				{
					enabled: false,
					reason: "percentage",
					debug: {
						context: {
							sessionId: "test",
							environment: "development",
						},
						flags: defaultFeatureFlags,
						evaluationTime: 10,
					},
				},
			];

			evaluations.forEach((evaluation) => {
				expect(typeof evaluation.enabled).toBe("boolean");
				expect(["default", "percentage", "whitelist", "blacklist", "error", "disabled"]).toContain(
					evaluation.reason,
				);
			});
		});
	});
});
