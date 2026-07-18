import type { VideoPlainObject } from "@suzumina.click/shared-types";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import VideoCardActions from "../video-card-actions";

function createMockVideo(overrides?: Partial<any>): VideoPlainObject {
	const base = {
		id: "video123",
		videoId: "abc123",
		title: "テスト動画タイトル",
		description: "説明",
		publishedAt: "2024-01-01T00:00:00Z",
		channelId: "channel123",
		channelTitle: "テストチャンネル",
		categoryId: "22",
		duration: "PT2H30M",
		liveBroadcastContent: "none",
		liveStreamingDetails: null,
		status: { embeddable: true },
		audioButtonCount: 0,
		_computed: {
			isArchived: true,
			isPremiere: false,
			isLive: false,
			isUpcoming: false,
			canCreateButton: true,
			videoType: "archived",
			thumbnailUrl: "https://example.com/thumbnail.jpg",
			youtubeUrl: "https://youtube.com/watch?v=abc123",
		},
	};
	return { ...base, ...overrides } as unknown as VideoPlainObject;
}

describe("VideoCardActions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("sidebar variant では『動画を見る』リンクのみ表示する", () => {
		render(<VideoCardActions video={createMockVideo()} variant="sidebar" />);

		const link = screen.getByText("動画を見る").closest("a");
		expect(link).toHaveAttribute("href", "/videos/video123");
		expect(screen.queryByText("ボタン作成")).not.toBeInTheDocument();
	});

	it("作成可能ならボタン作成リンクを表示する（ログイン状態に依存しない・認証は /buttons/create 側に委譲）", () => {
		render(<VideoCardActions video={createMockVideo()} variant="grid" />);

		const createLink = screen.getByText("ボタン作成").closest("a");
		expect(createLink).toHaveAttribute("href", "/buttons/create?video_id=video123");
		expect(screen.getByText("詳細を見る")).toBeInTheDocument();
		// ログイン分岐は撤去済み（/live 導線と同じく目的地の ProtectedRoute が認証の正本）
		expect(screen.queryByText("ログイン")).not.toBeInTheDocument();
	});

	it("配信中の動画は『配信中マーク』リンク（/live?v=）を表示する（SPR-146）", () => {
		const video = createMockVideo({
			liveBroadcastContent: "live",
			_computed: {
				...createMockVideo()._computed,
				isArchived: false,
				isLive: true,
				canCreateButton: false,
				videoType: "live",
			},
		});
		render(<VideoCardActions video={video} variant="grid" />);

		const markLink = screen.getByText("配信中マーク").closest("a");
		expect(markLink).toHaveAttribute("href", "/live?v=abc123");
		// live は destructive 赤（「配信中」バッジと同色ペア・赤は live 専用）
		expect(markLink?.className).toContain("bg-destructive");
		expect(screen.queryByText("ボタン作成")).not.toBeInTheDocument();
		// 認証は /live 側の ProtectedRoute に委譲（カードは session 非依存でログイン導線を出さない）
		expect(screen.queryByText("ログイン")).not.toBeInTheDocument();
	});

	it("配信予定の動画は『配信待機』リンク（info 青）を表示する", () => {
		const video = createMockVideo({
			liveBroadcastContent: "upcoming",
			_computed: {
				...createMockVideo()._computed,
				isArchived: false,
				isUpcoming: true,
				canCreateButton: false,
				videoType: "upcoming",
			},
		});
		render(<VideoCardActions video={video} variant="grid" />);

		const waitLink = screen.getByText("配信待機").closest("a");
		expect(waitLink).toHaveAttribute("href", "/live?v=abc123");
		// upcoming は info 青（「配信予告」バッジと同色ペア）
		expect(waitLink?.className).toContain("bg-info");
	});

	it("stale な liveBroadcastContent=live でも _computed が archived なら通常のボタン作成に進める（正本は videoType）", () => {
		// fetchYouTubeVideos の更新遅延で raw フィールドだけ live のまま残るケース。
		// _computed.videoType は actualEndTime から archived を判定済み＝バッジも「配信アーカイブ」表示
		const video = createMockVideo({ liveBroadcastContent: "live" });
		render(<VideoCardActions video={video} variant="grid" />);

		const createLink = screen.getByText("ボタン作成").closest("a");
		expect(createLink).toHaveAttribute("href", "/buttons/create?video_id=video123");
		expect(screen.queryByText("配信中マーク")).not.toBeInTheDocument();
	});

	it("作成不可（配信でない動画）なら理由を tooltip に持つ aria-disabled ボタンを表示する", () => {
		const video = createMockVideo({
			duration: "PT0S",
			_computed: {
				...createMockVideo()._computed,
				isArchived: false,
				canCreateButton: false,
				videoType: "normal",
			},
		});
		render(<VideoCardActions video={video} variant="grid" />);

		const createButton = screen.getByText("ボタン作成").closest("button");
		// native disabled は pointer-events-none で tooltip が出ないため aria-disabled を使う
		expect(createButton).toHaveAttribute("aria-disabled", "true");
		expect(createButton).not.toBeDisabled();
		expect(createButton).toHaveAttribute(
			"title",
			"動画の長さが不明なため音声ボタンを作成できません",
		);
		// ホバー/フォーカスで理由が届くよう href を持たない（遷移しない）
		expect(createButton).not.toHaveAttribute("href");
	});

	it("埋め込み制限がある場合は理由として埋め込み制限を表示する", () => {
		const video = createMockVideo({ status: { embeddable: false } });
		render(<VideoCardActions video={video} variant="grid" />);

		const createButton = screen.getByText("ボタン作成").closest("button");
		expect(createButton).toHaveAttribute("aria-disabled", "true");
		expect(createButton).toHaveAttribute(
			"title",
			"この動画は埋め込みが制限されているため、音声ボタンを作成できません",
		);
	});
});
