import { describe, expect, it } from "vitest";
import { Channel, ChannelId, ChannelTitle } from "../../value-objects/video/channel";
import {
	ContentDetails,
	type PrivacyStatus,
	PublishedAt,
	type UploadStatus,
	VideoContent,
	VideoId,
} from "../../value-objects/video/video-content";
import {
	VideoDescription,
	VideoDuration,
	VideoMetadata,
	VideoTitle,
} from "../../value-objects/video/video-metadata";
import {
	CommentCount,
	DislikeCount,
	LikeCount,
	VideoStatistics,
	ViewCount,
} from "../../value-objects/video/video-statistics";
import { type AudioButtonInfo, type LiveStreamingDetails, Video, type VideoTags } from "../video";

describe("Video Entity", () => {
	// Helper function to create sample video
	const createSampleVideo = (overrides?: {
		content?: VideoContent;
		metadata?: VideoMetadata;
		channel?: Channel;
		statistics?: VideoStatistics;
		tags?: VideoTags;
		audioButtonInfo?: AudioButtonInfo;
		liveStreamingDetails?: LiveStreamingDetails;
		liveBroadcastContent?: string;
		videoType?: string;
		lastFetchedAt?: Date;
	}): Video => {
		const defaultContent = new VideoContent(
			new VideoId("dQw4w9WgXcQ"),
			new PublishedAt("2024-01-01"),
			"public" as PrivacyStatus,
			"processed" as UploadStatus,
			new ContentDetails("2d", "hd", true, false, "rectangular"),
			'<iframe src="..."></iframe>',
			["music", "rickroll"],
		);

		const defaultMetadata = new VideoMetadata(
			new VideoTitle("Never Gonna Give You Up"),
			new VideoDescription("The official video"),
			new VideoDuration("PT3M32S"),
			"2d",
			"hd",
			true,
			false,
		);

		const defaultChannel = new Channel(
			new ChannelId("UCuAXFkgsw1L7xaCfnd5JJOw"),
			new ChannelTitle("Rick Astley"),
		);

		const defaultStatistics = new VideoStatistics(
			new ViewCount(1500000000),
			new LikeCount(14000000),
			new DislikeCount(500000),
			0,
			new CommentCount(2000000),
		);

		return new Video(
			overrides?.content || defaultContent,
			overrides?.metadata || defaultMetadata,
			overrides?.channel || defaultChannel,
			overrides?.statistics || defaultStatistics,
			overrides?.tags || { playlistTags: ["80s Music"], userTags: ["favorite"] },
			overrides?.audioButtonInfo || { count: 5, hasButtons: true },
			overrides?.liveStreamingDetails,
			overrides?.liveBroadcastContent || "none",
			overrides?.videoType || "normal",
			overrides?.lastFetchedAt || new Date("2024-01-15"),
		);
	};

	describe("constructor and getters", () => {
		it("should create video with all properties", () => {
			const video = createSampleVideo();

			expect(video.id).toBe("dQw4w9WgXcQ");
			expect(video.content.videoId.toString()).toBe("dQw4w9WgXcQ");
			expect(video.metadata.title.toString()).toBe("Never Gonna Give You Up");
			expect(video.channel.title.toString()).toBe("Rick Astley");
			expect(video.statistics?.viewCount).toBe(1500000000);
			expect(video.playlistTags).toEqual(["80s Music"]);
			expect(video.userTags).toEqual(["favorite"]);
			expect(video.audioButtonInfo).toEqual({ count: 5, hasButtons: true });
			// lastFetchedAt getterはISO文字列を返す
			expect(video.lastFetchedAt).toBe("2024-01-15T00:00:00.000Z");
			// lastModified getterはDateオブジェクトを返す
			expect(video.lastModified).toBeInstanceOf(Date);
		});

		it("should handle optional properties", () => {
			const video = new Video(
				new VideoContent(
					new VideoId("test123test"),
					new PublishedAt(new Date()),
					"public",
					"processed",
				),
				new VideoMetadata(new VideoTitle("Test Video"), new VideoDescription("Test")),
				new Channel(new ChannelId("UCxxxxxxxxxxxxxxxxxxxxxx"), new ChannelTitle("Test Channel")),
			);

			expect(video.statistics).toBeUndefined();
			expect(video.liveStreamingDetails).toBeUndefined();
			expect(video.playlistTags).toEqual([]);
			expect(video.userTags).toEqual([]);
			expect(video.audioButtonInfo).toEqual({ count: 0, hasButtons: false });
		});

		it("should return defensive copies of mutable properties", () => {
			const video = createSampleVideo();

			const tags1 = video.playlistTags;
			const tags2 = video.playlistTags;
			expect(tags1).not.toBe(tags2); // Different object references

			const audioInfo1 = video.audioButtonInfo;
			const audioInfo2 = video.audioButtonInfo;
			expect(audioInfo1).not.toBe(audioInfo2);
		});
	});

	describe("business logic methods", () => {
		describe("isAvailable", () => {
			it("should return true for public processed videos", () => {
				const video = createSampleVideo();
				expect(video.isAvailable()).toBe(true);
			});

			it("should return false for private videos", () => {
				const video = createSampleVideo({
					content: new VideoContent(
						new VideoId("test123test"),
						new PublishedAt(new Date()),
						"private",
						"processed",
					),
				});
				expect(video.isAvailable()).toBe(false);
			});
		});

		describe("isLiveOrUpcoming", () => {
			it("should return true for upcoming streams", () => {
				const futureDate = new Date();
				futureDate.setHours(futureDate.getHours() + 2);

				const video = createSampleVideo({
					liveStreamingDetails: {
						scheduledStartTime: futureDate,
					},
				});
				expect(video.isLiveOrUpcoming()).toBe(true);
			});

			it("should return true for live streams", () => {
				const video = createSampleVideo({
					liveStreamingDetails: {
						actualStartTime: new Date(),
					},
				});
				expect(video.isLiveOrUpcoming()).toBe(true);
			});

			it("should return false for ended streams", () => {
				const video = createSampleVideo({
					liveStreamingDetails: {
						actualStartTime: new Date("2024-01-01"),
						actualEndTime: new Date("2024-01-01"),
					},
				});
				expect(video.isLiveOrUpcoming()).toBe(false);
			});

			it("should return false when no streaming details", () => {
				const video = createSampleVideo();
				expect(video.isLiveOrUpcoming()).toBe(false);
			});
		});

		describe("isLive", () => {
			it("should return true for currently live streams", () => {
				const video = createSampleVideo({
					liveStreamingDetails: {
						actualStartTime: new Date(),
					},
				});
				expect(video.isLive()).toBe(true);
			});

			it("should return false for ended streams", () => {
				const video = createSampleVideo({
					liveStreamingDetails: {
						actualStartTime: new Date(),
						actualEndTime: new Date(),
					},
				});
				expect(video.isLive()).toBe(false);
			});
		});

		describe("hasAudioButtons", () => {
			it("should return true when has buttons", () => {
				const video = createSampleVideo();
				expect(video.hasAudioButtons).toBe(true);
			});

			it("should return false when no buttons", () => {
				const video = createSampleVideo({
					audioButtonInfo: { count: 0, hasButtons: false },
				});
				expect(video.hasAudioButtons).toBe(false);
			});
		});
	});

	describe("update methods", () => {
		describe("updateUserTags", () => {
			it("should update user tags", () => {
				const video = createSampleVideo();
				const updated = video.updateUserTags(["new", "tags"]);

				expect(updated.userTags).toEqual(["new", "tags"]);
				expect(updated.playlistTags).toEqual(["80s Music"]);
				expect(updated).not.toBe(video); // New instance
			});

			it("should filter invalid tags", () => {
				const video = createSampleVideo();
				const updated = video.updateUserTags([
					"valid",
					"", // Too short
					"a".repeat(31), // Too long
					"also valid",
				]);

				expect(updated.userTags).toEqual(["valid", "also valid"]);
			});

			it("should throw for too many tags", () => {
				const video = createSampleVideo();
				const tooManyTags = Array(11).fill("tag");

				expect(() => video.updateUserTags(tooManyTags)).toThrow(
					"ユーザータグは最大10個まで設定できます",
				);
			});
		});

		describe("updateStatistics", () => {
			it("should update statistics", () => {
				const video = createSampleVideo();
				const newStats = new VideoStatistics(new ViewCount(2000000000), new LikeCount(15000000));
				const updated = video.updateStatistics(newStats);

				expect(updated.statistics?.viewCount).toBe(2000000000);
				expect(updated).not.toBe(video);
			});
		});

		describe("updateAudioButtonInfo", () => {
			it("should update audio button info", () => {
				const video = createSampleVideo();
				const updated = video.updateAudioButtonInfo({ count: 10, hasButtons: true });

				expect(updated.audioButtonInfo).toEqual({ count: 10, hasButtons: true });
				expect(updated).not.toBe(video);
			});
		});
	});

	describe("equals", () => {
		it("should equal videos with same ID", () => {
			const video1 = createSampleVideo();
			const video2 = createSampleVideo({
				metadata: new VideoMetadata(
					new VideoTitle("Different Title"),
					new VideoDescription("Different"),
				),
			});

			expect(video1.equals(video2)).toBe(true); // Same ID
		});

		it("should not equal videos with different IDs", () => {
			const video1 = createSampleVideo();
			const video2 = createSampleVideo({
				content: new VideoContent(
					new VideoId("different123"),
					new PublishedAt(new Date()),
					"public",
					"processed",
				),
			});

			expect(video1.equals(video2)).toBe(false);
		});

		it("should handle null/undefined", () => {
			const video = createSampleVideo();
			expect(video.equals(null as any)).toBe(false);
			expect(video.equals(undefined as any)).toBe(false);
		});
	});

	describe("clone", () => {
		it("should create independent copy", () => {
			const original = createSampleVideo();
			const cloned = original.clone();

			expect(cloned).not.toBe(original);
			expect(cloned.equals(original)).toBe(true);

			// Verify deep clone
			expect(cloned.content).not.toBe(original.content);
			expect(cloned.metadata).not.toBe(original.metadata);
			expect(cloned.channel).not.toBe(original.channel);
			expect(cloned.statistics).not.toBe(original.statistics);
		});

		it("should handle cloning with undefined optional properties", () => {
			const video = new Video(
				new VideoContent(
					new VideoId("test123test"),
					new PublishedAt(new Date()),
					"public",
					"processed",
				),
				new VideoMetadata(new VideoTitle("Test"), new VideoDescription("Test")),
				new Channel(new ChannelId("UCxxxxxxxxxxxxxxxxxxxxxx"), new ChannelTitle("Test")),
			);

			const cloned = video.clone();
			expect(cloned.statistics).toBeUndefined();
			expect(cloned.liveStreamingDetails).toBeUndefined();
		});
	});

	describe("Video Type Detection", () => {
		it("should correctly identify live videos", () => {
			const liveVideo = new Video(
				new VideoContent(
					new VideoId("live123"),
					new PublishedAt(new Date()),
					"public",
					"processed",
				),
				new VideoMetadata(new VideoTitle("Live Stream"), new VideoDescription("Live")),
				new Channel(new ChannelId("UCxxxxxxxxxxxxxxxxxxxxxx"), new ChannelTitle("Test")),
				undefined, // statistics
				{ playlistTags: [], userTags: [] }, // tags
				{ count: 0, hasButtons: false }, // audioButtonInfo
				{
					actualStartTime: new Date(),
					// No actualEndTime means it's currently live
				},
				"live", // liveBroadcastContent
			);

			expect(liveVideo.getVideoType()).toBe("live");
			expect(liveVideo.isLiveStream()).toBe(true);
			expect(liveVideo.isArchivedStream()).toBe(false);
		});

		it("should correctly identify upcoming videos", () => {
			const upcomingVideo = new Video(
				new VideoContent(
					new VideoId("upcoming123"),
					new PublishedAt(new Date()),
					"public",
					"processed",
				),
				new VideoMetadata(new VideoTitle("Upcoming Stream"), new VideoDescription("Upcoming")),
				new Channel(new ChannelId("UCxxxxxxxxxxxxxxxxxxxxxx"), new ChannelTitle("Test")),
				undefined, // statistics
				{ playlistTags: [], userTags: [] }, // tags
				{ count: 0, hasButtons: false }, // audioButtonInfo
				{
					scheduledStartTime: new Date(Date.now() + 86400000), // Tomorrow
				},
				"upcoming", // liveBroadcastContent
			);

			expect(upcomingVideo.getVideoType()).toBe("upcoming");
			expect(upcomingVideo.isUpcomingStream()).toBe(true);
			expect(upcomingVideo.isArchivedStream()).toBe(false);
		});

		it("should correctly identify archived streams", () => {
			const archivedStream = new Video(
				new VideoContent(
					new VideoId("archived123"),
					new PublishedAt(new Date()),
					"public",
					"processed",
				),
				new VideoMetadata(
					new VideoTitle("Past Stream"),
					new VideoDescription("Past"),
					new VideoDuration("PT2H30M"), // 2.5 hours
				),
				new Channel(new ChannelId("UCxxxxxxxxxxxxxxxxxxxxxx"), new ChannelTitle("Test")),
				undefined, // statistics
				{ playlistTags: [], userTags: [] }, // tags
				{ count: 10, hasButtons: true }, // audioButtonInfo
				{
					actualStartTime: new Date(Date.now() - 86400000), // Yesterday
					actualEndTime: new Date(Date.now() - 80000000), // Ended yesterday
				},
				"none", // liveBroadcastContent
			);

			expect(archivedStream.getVideoType()).toBe("archived");
			expect(archivedStream.isArchivedStream()).toBe(true);
			expect(archivedStream.isLiveStream()).toBe(false);
			expect(archivedStream.canCreateAudioButton()).toBe(true);
		});

		it("should not identify live video with end time as archived", () => {
			// This is the bug case - a video marked as "live" but has an end time
			const buggyVideo = new Video(
				new VideoContent(
					new VideoId("buggy123"),
					new PublishedAt(new Date()),
					"public",
					"processed",
				),
				new VideoMetadata(
					new VideoTitle("Buggy Stream"),
					new VideoDescription("Buggy"),
					new VideoDuration("PT1H"), // 1 hour
				),
				new Channel(new ChannelId("UCxxxxxxxxxxxxxxxxxxxxxx"), new ChannelTitle("Test")),
				undefined, // statistics
				{ playlistTags: [], userTags: [] }, // tags
				{ count: 0, hasButtons: false }, // audioButtonInfo
				{
					actualStartTime: new Date(Date.now() - 7200000), // 2 hours ago
					actualEndTime: new Date(Date.now() - 3600000), // 1 hour ago
				},
				"live", // liveBroadcastContent still says "live" (this is the bug)
			);

			// Should be identified as live, not archived
			expect(buggyVideo.getVideoType()).toBe("live");
			expect(buggyVideo.isLiveStream()).toBe(true);
			expect(buggyVideo.isArchivedStream()).toBe(false);
		});

		it("should identify live video based on liveStreamingDetails when liveBroadcastContent is none", () => {
			// This handles the case where YouTube API doesn't update liveBroadcastContent properly
			const liveVideoWithNoneBroadcast = new Video(
				new VideoContent(
					new VideoId("97UnRtIlMc0"),
					new PublishedAt(new Date()),
					"public",
					"processed",
				),
				new VideoMetadata(
					new VideoTitle("Live Stream with none broadcast content"),
					new VideoDescription("Live"),
				),
				new Channel(new ChannelId("UCxxxxxxxxxxxxxxxxxxxxxx"), new ChannelTitle("Test")),
				undefined, // statistics
				{ playlistTags: [], userTags: [] }, // tags
				{ count: 0, hasButtons: false }, // audioButtonInfo
				{
					actualStartTime: new Date(Date.now() - 3600000), // Started 1 hour ago
					// No actualEndTime means it's still live
					concurrentViewers: 121, // Has concurrent viewers
				}, // liveStreamingDetails
				"none", // liveBroadcastContent says "none" but it's actually live
			);

			// Should be identified as live based on liveStreamingDetails
			expect(liveVideoWithNoneBroadcast.getVideoType()).toBe("live");
			expect(liveVideoWithNoneBroadcast.isLiveStream()).toBe(true);
			expect(liveVideoWithNoneBroadcast.isArchivedStream()).toBe(false);
		});

		it("should correctly identify premiere videos", () => {
			const premiereVideo = new Video(
				new VideoContent(
					new VideoId("premiere123"),
					new PublishedAt(new Date()),
					"public",
					"processed",
				),
				new VideoMetadata(
					new VideoTitle("Premiere Video"),
					new VideoDescription("Premiere"),
					new VideoDuration("PT10M"), // 10 minutes
				),
				new Channel(new ChannelId("UCxxxxxxxxxxxxxxxxxxxxxx"), new ChannelTitle("Test")),
				undefined, // statistics
				{ playlistTags: [], userTags: [] }, // tags
				{ count: 0, hasButtons: false }, // audioButtonInfo
				{
					actualStartTime: new Date(Date.now() - 3600000), // 1 hour ago
					actualEndTime: new Date(Date.now() - 3000000), // 50 minutes ago
				},
				"none", // liveBroadcastContent
			);

			expect(premiereVideo.getVideoType()).toBe("premiere");
			expect(premiereVideo.isPremiere()).toBe(true);
			expect(premiereVideo.isArchivedStream()).toBe(false);
		});

		it("should correctly identify normal videos", () => {
			const normalVideo = new Video(
				new VideoContent(
					new VideoId("normal123"),
					new PublishedAt(new Date()),
					"public",
					"processed",
				),
				new VideoMetadata(
					new VideoTitle("Normal Video"),
					new VideoDescription("Normal"),
					new VideoDuration("PT15M"), // 15 minutes
				),
				new Channel(new ChannelId("UCxxxxxxxxxxxxxxxxxxxxxx"), new ChannelTitle("Test")),
				undefined, // statistics
				{ playlistTags: [], userTags: [] }, // tags
				{ count: 0, hasButtons: false }, // audioButtonInfo
				undefined, // No liveStreamingDetails
				"none", // liveBroadcastContent
			);

			expect(normalVideo.getVideoType()).toBe("normal");
			expect(normalVideo.isLiveStream()).toBe(false);
			expect(normalVideo.isArchivedStream()).toBe(false);
			expect(normalVideo.canCreateAudioButton()).toBe(false);
		});
	});
});
