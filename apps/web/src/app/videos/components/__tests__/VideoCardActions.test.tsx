import type { VideoPlainObject } from "@suzumina.click/shared-types";
import { render, screen } from "@testing-library/react";
import { useSession } from "next-auth/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import VideoCardActions from "../VideoCardActions";

vi.mock("next-auth/react", () => ({
	useSession: vi.fn(),
}));

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
	return { ...base, ...overrides } as VideoPlainObject;
}

const loggedIn = { data: { user: { id: "user123", name: "テストユーザー" } } };
const loggedOut = { data: null };

describe("VideoCardActions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("sidebar variant では『動画を見る』リンクのみ表示する", () => {
		(useSession as any).mockReturnValue(loggedOut);
		render(<VideoCardActions video={createMockVideo()} variant="sidebar" />);

		const link = screen.getByText("動画を見る").closest("a");
		expect(link).toHaveAttribute("href", "/videos/video123");
		expect(screen.queryByText("ボタン作成")).not.toBeInTheDocument();
	});

	it("ログイン済み・作成可能ならボタン作成リンクを表示する", () => {
		(useSession as any).mockReturnValue(loggedIn);
		render(<VideoCardActions video={createMockVideo()} variant="grid" />);

		const createLink = screen.getByText("ボタン作成").closest("a");
		expect(createLink).toHaveAttribute("href", "/buttons/create?video_id=video123");
		expect(screen.getByText("詳細を見る")).toBeInTheDocument();
	});

	it("未ログインならログイン導線を表示する（callbackUrl 付き）", () => {
		(useSession as any).mockReturnValue(loggedOut);
		render(<VideoCardActions video={createMockVideo()} variant="grid" />);

		const loginLink = screen.getByText("ログイン").closest("a");
		expect(loginLink).toHaveAttribute(
			"href",
			"/auth/signin?callbackUrl=%2Fbuttons%2Fcreate%3Fvideo_id%3Dvideo123",
		);
		expect(screen.queryByText("ボタン作成")).not.toBeInTheDocument();
	});

	it("ログイン済みでも作成不可なら理由を tooltip に持つ aria-disabled ボタンを表示する", () => {
		(useSession as any).mockReturnValue(loggedIn);
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

		const createButton = screen.getByText("ボタン作成").closest("button");
		// native disabled は pointer-events-none で tooltip が出ないため aria-disabled を使う
		expect(createButton).toHaveAttribute("aria-disabled", "true");
		expect(createButton).not.toBeDisabled();
		expect(createButton).toHaveAttribute("title", "ライブ配信中は音声ボタンを作成できません");
		// ホバー/フォーカスで理由が届くよう href を持たない（遷移しない）
		expect(createButton).not.toHaveAttribute("href");
	});

	it("埋め込み制限がある場合は理由として埋め込み制限を表示する", () => {
		(useSession as any).mockReturnValue(loggedIn);
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
