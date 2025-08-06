import { describe, expect, it } from "vitest";
import type { WorkDocument } from "../../entities/work";
import type { FirestoreWorkEvaluation } from "../../entities/work-evaluation";
import type { WorkDoc, WorkEvaluation } from "../index";

// Note: These types will be imported once they are defined
// For now, we'll use placeholders for testing the aliasing system

import { isAudioButton, isUser, isVideoDoc, isWorkDoc } from "../index";

// Type-level tests to ensure aliases are correctly mapped
type AssertEqual<T, U> = T extends U ? (U extends T ? true : false) : false;

describe("Type Aliases", () => {
	describe("Entity Aliases", () => {
		it("should correctly alias WorkDoc type", () => {
			type TestWork = AssertEqual<WorkDoc, WorkDocument>;
			const _test: TestWork = true;
			expect(_test).toBe(true);
		});

		it("should correctly alias WorkEvaluation type", () => {
			type TestWorkEvaluation = AssertEqual<WorkEvaluation, FirestoreWorkEvaluation>;
			const _test: TestWorkEvaluation = true;
			expect(_test).toBe(true);
		});
	});

	// API Aliases are no longer needed since DLsiteApiResponse is the primary type now

	describe("Type Guards", () => {
		describe("isWorkDoc", () => {
			it("should return true for valid WorkDoc objects", () => {
				const validWork = {
					id: "RJ123456",
					title: "Test Work",
					circleId: "RG12345",
					// ... other required fields
				};
				expect(isWorkDoc(validWork)).toBe(true);
			});

			it("should return false for invalid objects", () => {
				expect(isWorkDoc(null)).toBe(false);
				expect(isWorkDoc(undefined)).toBe(false);
				expect(isWorkDoc({})).toBe(false);
				expect(isWorkDoc({ id: "test" })).toBe(false);
				expect(isWorkDoc({ id: "test", title: "test" })).toBe(false);
			});
		});

		describe("isUser", () => {
			it("should return true for valid User objects", () => {
				const validUser = {
					id: "user123",
					email: "test@example.com",
					role: "user",
					// ... other required fields
				};
				expect(isUser(validUser)).toBe(true);
			});

			it("should return false for invalid objects", () => {
				expect(isUser(null)).toBe(false);
				expect(isUser(undefined)).toBe(false);
				expect(isUser({})).toBe(false);
				expect(isUser({ id: "test" })).toBe(false);
				expect(isUser({ id: "test", email: "test@example.com" })).toBe(false);
			});
		});

		describe("isVideoDoc", () => {
			it("should return true for valid VideoDoc objects", () => {
				const validVideo = {
					id: "video123",
					title: "Test Video",
					channelId: "channel123",
					// ... other required fields
				};
				expect(isVideoDoc(validVideo)).toBe(true);
			});

			it("should return false for invalid objects", () => {
				expect(isVideoDoc(null)).toBe(false);
				expect(isVideoDoc(undefined)).toBe(false);
				expect(isVideoDoc({})).toBe(false);
				expect(isVideoDoc({ id: "test" })).toBe(false);
				expect(isVideoDoc({ id: "test", title: "test" })).toBe(false);
			});
		});

		describe("isAudioButton", () => {
			it("should return true for valid AudioButton objects", () => {
				const validAudioButton = {
					id: "button123",
					sourceVideoId: "video123",
					startTime: 123,
					// ... other required fields
				};
				expect(isAudioButton(validAudioButton)).toBe(true);
			});

			it("should return false for invalid objects", () => {
				expect(isAudioButton(null)).toBe(false);
				expect(isAudioButton(undefined)).toBe(false);
				expect(isAudioButton({})).toBe(false);
				expect(isAudioButton({ id: "test" })).toBe(false);
				expect(isAudioButton({ id: "test", sourceVideoId: "video123" })).toBe(false);
			});
		});
	});
});
