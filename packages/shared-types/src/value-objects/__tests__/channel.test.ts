import { describe, expect, it } from "vitest";
import { Channel, ChannelId, ChannelTitle } from "../channel";

describe("ChannelId", () => {
	describe("constructor", () => {
		it("should create valid channel ID", () => {
			const id = new ChannelId("UCxxxxxxxxxxxxxxxxxxxxxx");
			expect(id.toString()).toBe("UCxxxxxxxxxxxxxxxxxxxxxx");
		});

		it("should trim whitespace", () => {
			const id = new ChannelId("  UCxxxxxxxxxxxxxxxxxxxxxx  ");
			expect(id.toString()).toBe("UCxxxxxxxxxxxxxxxxxxxxxx");
		});

		it("should accept handle format", () => {
			const id = new ChannelId("@channelhandle");
			expect(id.toString()).toBe("@channelhandle");
		});

		it("should throw for empty string", () => {
			expect(() => new ChannelId("")).toThrow("channelId must not be empty");
		});

		it("should throw for whitespace only", () => {
			expect(() => new ChannelId("   ")).toThrow("channelId must not be empty");
		});
	});

	describe("toUrl", () => {
		it("should generate correct channel URL", () => {
			const id = new ChannelId("UCxxxxxxxxxxxxxxxxxxxxxx");
			expect(id.toUrl()).toBe("https://www.youtube.com/channel/UCxxxxxxxxxxxxxxxxxxxxxx");
		});

		it("should generate channel URL even for handles", () => {
			const id = new ChannelId("@channelhandle");
			expect(id.toUrl()).toBe("https://www.youtube.com/channel/@channelhandle");
		});
	});

	describe("toHandleUrl", () => {
		it("should generate handle URL for handles", () => {
			const id = new ChannelId("@channelhandle");
			expect(id.toHandleUrl()).toBe("https://www.youtube.com/@channelhandle");
		});

		it("should fall back to channel URL for regular IDs", () => {
			const id = new ChannelId("UCxxxxxxxxxxxxxxxxxxxxxx");
			expect(id.toHandleUrl()).toBe("https://www.youtube.com/channel/UCxxxxxxxxxxxxxxxxxxxxxx");
		});
	});

	describe("validation", () => {
		it("should validate 24-character channel ID", () => {
			const id = new ChannelId("UCx_x_x_x_x_x_x_x_x_x_x_");
			expect(id.isValid()).toBe(true);
			expect(id.getValidationErrors()).toHaveLength(0);
		});

		it("should validate handle format", () => {
			const id = new ChannelId("@validhandle123");
			expect(id.isValid()).toBe(true);
			expect(id.getValidationErrors()).toHaveLength(0);
		});

		it("should invalidate wrong length non-handle", () => {
			const id = new ChannelId("UC123"); // too short
			expect(id.isValid()).toBe(false);
			expect(id.getValidationErrors()).toContain(
				"Channel ID should be 24 characters or start with @",
			);
		});

		it("should invalidate special characters", () => {
			const id = new ChannelId("UC!@#$%^&*()xxxxxxxxxxxx");
			expect(id.isValid()).toBe(false);
			expect(id.getValidationErrors()).toContain("Channel ID contains invalid characters");
		});
	});

	describe("equals", () => {
		it("should equal same channel ID", () => {
			const id1 = new ChannelId("UCxxxxxxxxxxxxxxxxxxxxxx");
			const id2 = new ChannelId("UCxxxxxxxxxxxxxxxxxxxxxx");
			expect(id1.equals(id2)).toBe(true);
		});

		it("should not equal different channel IDs", () => {
			const id1 = new ChannelId("UCxxxxxxxxxxxxxxxxxxxxxx");
			const id2 = new ChannelId("UCyyyyyyyyyyyyyyyyyyyy");
			expect(id1.equals(id2)).toBe(false);
		});

		it("should handle null/undefined", () => {
			const id = new ChannelId("UCxxxxxxxxxxxxxxxxxxxxxx");
			expect(id.equals(null as any)).toBe(false);
			expect(id.equals(undefined as any)).toBe(false);
		});
	});

	describe("clone", () => {
		it("should create independent copy", () => {
			const original = new ChannelId("UCxxxxxxxxxxxxxxxxxxxxxx");
			const cloned = original.clone();

			expect(cloned).not.toBe(original);
			expect(cloned.toString()).toBe(original.toString());
			expect(cloned.equals(original)).toBe(true);
		});
	});
});

describe("ChannelTitle", () => {
	describe("constructor", () => {
		it("should create valid title", () => {
			const title = new ChannelTitle("Channel Name");
			expect(title.toString()).toBe("Channel Name");
		});

		it("should trim whitespace", () => {
			const title = new ChannelTitle("  Channel Name  ");
			expect(title.toString()).toBe("Channel Name");
		});

		it("should throw for empty string", () => {
			expect(() => new ChannelTitle("")).toThrow("channelTitle must not be empty");
		});
	});

	describe("withPrefix and withSuffix", () => {
		it("should add prefix", () => {
			const title = new ChannelTitle("Channel");
			expect(title.withPrefix("Official ")).toBe("Official Channel");
		});

		it("should add suffix", () => {
			const title = new ChannelTitle("Channel");
			expect(title.withSuffix(" Official")).toBe("Channel Official");
		});
	});

	describe("toUpperCase", () => {
		it("should convert to uppercase", () => {
			const title = new ChannelTitle("Channel Name");
			expect(title.toUpperCase()).toBe("CHANNEL NAME");
		});
	});

	describe("validation", () => {
		it("should validate normal title", () => {
			const title = new ChannelTitle("Normal Channel");
			expect(title.isValid()).toBe(true);
			expect(title.getValidationErrors()).toHaveLength(0);
		});

		it("should invalidate very long title", () => {
			const longTitle = "a".repeat(101);
			const title = new ChannelTitle(longTitle);
			expect(title.isValid()).toBe(false);
			expect(title.getValidationErrors()).toContain("Channel title cannot exceed 100 characters");
		});
	});

	describe("equals", () => {
		it("should equal same title", () => {
			const title1 = new ChannelTitle("Channel");
			const title2 = new ChannelTitle("Channel");
			expect(title1.equals(title2)).toBe(true);
		});

		it("should not equal different titles", () => {
			const title1 = new ChannelTitle("Channel 1");
			const title2 = new ChannelTitle("Channel 2");
			expect(title1.equals(title2)).toBe(false);
		});
	});

	describe("clone", () => {
		it("should create independent copy", () => {
			const original = new ChannelTitle("Channel");
			const cloned = original.clone();

			expect(cloned).not.toBe(original);
			expect(cloned.equals(original)).toBe(true);
		});
	});
});

describe("Channel", () => {
	const createSampleChannel = () => {
		return new Channel(
			new ChannelId("UCxxxxxxxxxxxxxxxxxxxxxx"), // 24 characters
			new ChannelTitle("Sample Channel"),
		);
	};

	describe("fromPlainObject", () => {
		it("should create from plain object", () => {
			const channel = Channel.fromPlainObject({
				channelId: "UCyyyyyyyyyyyyyyyyyyyy",
				channelTitle: "Test Channel",
			});

			expect(channel.id.toString()).toBe("UCyyyyyyyyyyyyyyyyyyyy");
			expect(channel.title.toString()).toBe("Test Channel");
		});

		it("should handle handle format", () => {
			const channel = Channel.fromPlainObject({
				channelId: "@testhandle",
				channelTitle: "Test Handle Channel",
			});

			expect(channel.id.toString()).toBe("@testhandle");
			expect(channel.getUrl()).toBe("https://www.youtube.com/channel/@testhandle");
		});
	});

	describe("getUrl", () => {
		it("should return channel URL", () => {
			const channel = createSampleChannel();
			expect(channel.getUrl()).toBe("https://www.youtube.com/channel/UCxxxxxxxxxxxxxxxxxxxxxx");
		});
	});

	describe("getDisplayName", () => {
		it("should return channel title", () => {
			const channel = createSampleChannel();
			expect(channel.getDisplayName()).toBe("Sample Channel");
		});
	});

	describe("toPlainObject", () => {
		it("should convert to plain object", () => {
			const channel = createSampleChannel();
			const plain = channel.toPlainObject();

			expect(plain).toEqual({
				channelId: "UCxxxxxxxxxxxxxxxxxxxxxx",
				channelTitle: "Sample Channel",
			});
		});
	});

	describe("validation", () => {
		it("should validate valid channel", () => {
			const channel = createSampleChannel();
			expect(channel.isValid()).toBe(true);
			expect(channel.getValidationErrors()).toHaveLength(0);
		});

		it("should report ID errors", () => {
			const channel = new Channel(new ChannelId("invalid!@#"), new ChannelTitle("Title"));

			expect(channel.isValid()).toBe(false);
			const errors = channel.getValidationErrors();
			expect(errors.some((e) => e.startsWith("ID:"))).toBe(true);
		});

		it("should report title errors", () => {
			const channel = new Channel(
				new ChannelId("UCxxxxxxxxxxxxxxxxxxxxxx"),
				new ChannelTitle("a".repeat(101)),
			);

			expect(channel.isValid()).toBe(false);
			const errors = channel.getValidationErrors();
			expect(errors.some((e) => e.startsWith("Title:"))).toBe(true);
		});

		it("should report multiple errors", () => {
			const channel = new Channel(new ChannelId("short"), new ChannelTitle("a".repeat(101)));

			expect(channel.isValid()).toBe(false);
			const errors = channel.getValidationErrors();
			expect(errors.length).toBeGreaterThanOrEqual(2);
		});
	});

	describe("equals", () => {
		it("should equal identical channels", () => {
			const channel1 = createSampleChannel();
			const channel2 = createSampleChannel();
			expect(channel1.equals(channel2)).toBe(true);
		});

		it("should not equal with different ID", () => {
			const channel1 = createSampleChannel();
			const channel2 = new Channel(new ChannelId("UCyyyyyyyyyyyyyyyyyyyy"), channel1.title);
			expect(channel1.equals(channel2)).toBe(false);
		});

		it("should not equal with different title", () => {
			const channel1 = createSampleChannel();
			const channel2 = new Channel(channel1.id, new ChannelTitle("Different Title"));
			expect(channel1.equals(channel2)).toBe(false);
		});

		it("should handle null/undefined", () => {
			const channel = createSampleChannel();
			expect(channel.equals(null as any)).toBe(false);
			expect(channel.equals(undefined as any)).toBe(false);
		});

		it("should handle wrong type", () => {
			const channel = createSampleChannel();
			expect(channel.equals("not a channel" as any)).toBe(false);
		});
	});

	describe("clone", () => {
		it("should create independent copy", () => {
			const original = createSampleChannel();
			const cloned = original.clone();

			expect(cloned).not.toBe(original);
			expect(cloned.equals(original)).toBe(true);

			// Verify deep clone
			expect(cloned.id).not.toBe(original.id);
			expect(cloned.title).not.toBe(original.title);
		});
	});
});
