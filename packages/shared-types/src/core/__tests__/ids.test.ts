import { describe, expect, it } from "vitest";
import {
	AudioButtonId,
	ChannelId,
	CircleId,
	ContactId,
	CreatorId,
	FavoriteId,
	UserId,
	VideoId,
	WorkId,
} from "../ids";

describe("Domain-specific ID types", () => {
	describe("WorkId", () => {
		it("有効なWorkIdを作成できる", () => {
			expect(WorkId.of("RJ123456")).toBe("RJ123456");
			expect(WorkId.of("RJ12345678")).toBe("RJ12345678");
		});

		it("無効なフォーマットでエラーをスローする", () => {
			expect(() => WorkId.of("123456")).toThrow("Invalid WorkId format");
			expect(() => WorkId.of("RJ12345")).toThrow("Invalid WorkId format");
			expect(() => WorkId.of("RJ123456789")).toThrow("Invalid WorkId format");
		});

		it("tryOfで安全に作成できる", () => {
			expect(WorkId.tryOf("RJ123456")).toBe("RJ123456");
			expect(WorkId.tryOf("invalid")).toBeUndefined();
		});

		it("isValidで検証できる", () => {
			expect(WorkId.isValid("RJ123456")).toBe(true);
			expect(WorkId.isValid("invalid")).toBe(false);
			expect(WorkId.isValid(123)).toBe(false);
		});

		it("parseで文字列をパースできる", () => {
			expect(WorkId.parse("RJ123456")).toBe("RJ123456");
			expect(() => WorkId.parse(123)).toThrow("Expected string");
		});
	});

	describe("CircleId", () => {
		it("有効なCircleIdを作成できる", () => {
			expect(CircleId.of("RG12345")).toBe("RG12345");
		});

		it("空文字列でエラーをスローする", () => {
			expect(() => CircleId.of("")).toThrow("CircleId cannot be empty");
		});

		it("tryOfで安全に作成できる", () => {
			expect(CircleId.tryOf("RG12345")).toBe("RG12345");
			expect(CircleId.tryOf("")).toBeUndefined();
		});

		it("isValidで検証できる", () => {
			expect(CircleId.isValid("RG12345")).toBe(true);
			expect(CircleId.isValid("")).toBe(false);
		});
	});

	describe("UserId", () => {
		it("有効なDiscord UserIdを作成できる", () => {
			expect(UserId.of("12345678901234567")).toBe("12345678901234567");
		});

		it("無効なフォーマットでエラーをスローする", () => {
			expect(() => UserId.of("abc")).toThrow("Invalid Discord UserId");
			expect(() => UserId.of("1234567890123456")).toThrow("Invalid Discord UserId");
		});

		it("isValidで検証できる", () => {
			expect(UserId.isValid("12345678901234567")).toBe(true);
			expect(UserId.isValid("abc")).toBe(false);
		});
	});

	describe("VideoId", () => {
		it("有効なYouTube VideoIdを作成できる", () => {
			expect(VideoId.of("dQw4w9WgXcQ")).toBe("dQw4w9WgXcQ");
		});

		it("無効なフォーマットでエラーをスローする", () => {
			expect(() => VideoId.of("short")).toThrow("Invalid YouTube VideoId");
			expect(() => VideoId.of("toolongvideoid")).toThrow("Invalid YouTube VideoId");
		});

		it("isValidで検証できる", () => {
			expect(VideoId.isValid("dQw4w9WgXcQ")).toBe(true);
			expect(VideoId.isValid("invalid")).toBe(false);
		});
	});

	describe("ChannelId", () => {
		it("有効なYouTube ChannelIdを作成できる", () => {
			const channelId = "UCxxxxxxxxxxxxxxxxxxxxxxx".slice(0, 24);
			expect(ChannelId.of(channelId)).toBe(channelId);
		});

		it("無効なフォーマットでエラーをスローする", () => {
			expect(() => ChannelId.of("invalid")).toThrow("Invalid YouTube ChannelId");
			expect(() => ChannelId.of("UCshort")).toThrow("Invalid YouTube ChannelId");
		});

		it("isValidで検証できる", () => {
			const validId = "UCxxxxxxxxxxxxxxxxxxxxxxx".slice(0, 24);
			expect(ChannelId.isValid(validId)).toBe(true);
			expect(ChannelId.isValid("invalid")).toBe(false);
		});
	});

	describe("AudioButtonId", () => {
		it("新しいAudioButtonIdを生成できる", () => {
			const id = AudioButtonId.generate();
			expect(id).toMatch(/^ab_[a-z0-9]+_[a-z0-9]+$/);
			expect(id.length).toBeGreaterThan(10);
		});

		it("既存の文字列からAudioButtonIdを作成できる", () => {
			const id = "ab_test_12345";
			expect(AudioButtonId.of(id)).toBe(id);
		});

		it("無効なフォーマットでエラーをスローする", () => {
			expect(() => AudioButtonId.of("invalid")).toThrow("Invalid AudioButtonId");
			expect(() => AudioButtonId.of("ab_")).toThrow("Invalid AudioButtonId");
		});

		it("isValidで検証できる", () => {
			expect(AudioButtonId.isValid("ab_test_12345")).toBe(true);
			expect(AudioButtonId.isValid("invalid")).toBe(false);
			expect(AudioButtonId.isValid(123)).toBe(false);
		});
	});

	describe("CreatorId", () => {
		it("有効なCreatorIdを作成できる", () => {
			expect(CreatorId.of("creator123")).toBe("creator123");
		});

		it("空文字列でエラーをスローする", () => {
			expect(() => CreatorId.of("")).toThrow("CreatorId cannot be empty");
		});

		it("isValidで検証できる", () => {
			expect(CreatorId.isValid("creator123")).toBe(true);
			expect(CreatorId.isValid("")).toBe(false);
		});
	});

	describe("ContactId", () => {
		it("有効なContactIdを作成できる", () => {
			expect(ContactId.of("contact123")).toBe("contact123");
		});

		it("空文字列でエラーをスローする", () => {
			expect(() => ContactId.of("")).toThrow("ContactId cannot be empty");
		});

		it("isValidで検証できる", () => {
			expect(ContactId.isValid("contact123")).toBe(true);
			expect(ContactId.isValid("")).toBe(false);
		});
	});

	describe("FavoriteId", () => {
		it("有効なFavoriteIdを作成できる", () => {
			expect(FavoriteId.of("fav123")).toBe("fav123");
		});

		it("空文字列でエラーをスローする", () => {
			expect(() => FavoriteId.of("")).toThrow("FavoriteId cannot be empty");
		});

		it("isValidで検証できる", () => {
			expect(FavoriteId.isValid("fav123")).toBe(true);
			expect(FavoriteId.isValid("")).toBe(false);
		});
	});
});
