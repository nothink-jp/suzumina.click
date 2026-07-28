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

describe("VideoCardActions（主アクションは全状態で /watch・導線再設計の統一案）", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("sidebar variant では『動画を見る』リンクのみ表示する", () => {
		render(<VideoCardActions video={createMockVideo()} variant="sidebar" />);

		const link = screen.getByText("動画を見る").closest("a");
		expect(link).toHaveAttribute("href", "/videos/video123");
		expect(screen.queryByText("マークして見る")).not.toBeInTheDocument();
	});

	it("アーカイブは『マークして見る』リンク（/watch?v=）を表示する（カードから「ボタン作成」は降りた）", () => {
		render(<VideoCardActions video={createMockVideo()} variant="grid" />);

		const markLink = screen.getByText("マークして見る").closest("a");
		expect(markLink).toHaveAttribute("href", "/watch?v=abc123");
		expect(screen.getByText("詳細を見る")).toBeInTheDocument();
		// 「ボタン作成」（狙い撃ち）の正式な入口は動画詳細ページの副アクション
		expect(screen.queryByText("ボタン作成")).not.toBeInTheDocument();
		// ログイン分岐は撤去済み（目的地の ProtectedRoute が認証の正本）
		expect(screen.queryByText("ログイン")).not.toBeInTheDocument();
	});

	it("配信中の動画は『配信中マーク』リンク（destructive 赤）を表示する（SPR-146）", () => {
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
		expect(markLink).toHaveAttribute("href", "/watch?v=abc123");
		// live は destructive 赤（「配信中」バッジと同色ペア・赤は live 専用）
		expect(markLink?.className).toContain("bg-destructive");
		// 認証は /watch 側の ProtectedRoute に委譲（カードは session 非依存でログイン導線を出さない）
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
		expect(waitLink).toHaveAttribute("href", "/watch?v=abc123");
		// upcoming は info 青（「配信予告」バッジと同色ペア）
		expect(waitLink?.className).toContain("bg-info");
	});

	it("stale な liveBroadcastContent=live でも _computed が archived なら『マークして見る』になる（正本は videoType）", () => {
		// fetchYouTubeVideos の更新遅延で raw フィールドだけ live のまま残るケース。
		// _computed.videoType は actualEndTime から archived を判定済み＝バッジも「配信アーカイブ」表示
		const video = createMockVideo({ liveBroadcastContent: "live" });
		render(<VideoCardActions video={video} variant="grid" />);

		const markLink = screen.getByText("マークして見る").closest("a");
		expect(markLink).toHaveAttribute("href", "/watch?v=abc123");
		expect(screen.queryByText("配信中マーク")).not.toBeInTheDocument();
	});

	it("配信アーカイブでない動画は理由を tooltip に持つ aria-disabled ボタンを表示する（マークしても仕上げられない）", () => {
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

		const markButton = screen.getByText("マークして見る").closest("button");
		// native disabled は pointer-events-none で tooltip が出ないため aria-disabled を使う
		expect(markButton).toHaveAttribute("aria-disabled", "true");
		expect(markButton).not.toBeDisabled();
		expect(markButton).toHaveAttribute("title", "動画の長さが不明なため音声ボタンを作成できません");
		// ホバー/フォーカスで理由が届くよう href を持たない（遷移しない）
		expect(markButton).not.toHaveAttribute("href");
	});

	it("埋め込み制限がある場合は配信中でも無効化する（プレイヤーが動かない＝事実の通知）", () => {
		const video = createMockVideo({
			status: { embeddable: false },
			_computed: {
				...createMockVideo()._computed,
				isArchived: false,
				isLive: true,
				canCreateButton: false,
				videoType: "live",
			},
		});
		render(<VideoCardActions video={video} variant="grid" />);

		const markButton = screen.getByText("マークして見る").closest("button");
		expect(markButton).toHaveAttribute("aria-disabled", "true");
		expect(markButton).toHaveAttribute(
			"title",
			"この動画は埋め込みが制限されているため、マーキングできません",
		);
		expect(screen.queryByText("配信中マーク")).not.toBeInTheDocument();
	});
});
