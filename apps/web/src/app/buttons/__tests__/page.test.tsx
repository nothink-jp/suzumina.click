import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AudioButtonsPage from "../page";

// Mock next/server to avoid import errors
vi.mock("next/server", () => ({
	cookies: vi.fn(() => ({
		get: vi.fn(),
		set: vi.fn(),
	})),
	headers: vi.fn(() => new Map()),
}));

// Mock auth.ts to avoid NextAuth module resolution issues
vi.mock("@/auth", () => ({
	auth: () => Promise.resolve(null),
}));

// Mock the server actions
vi.mock("../actions", () => ({
	getAudioButtonsList: vi.fn().mockResolvedValue({
		success: true,
		data: {
			audioButtons: [
				{
					id: "audio-1",
					title: "テスト音声ボタン1",
					description: "説明1",
					tags: ["テスト"],
					sourceVideoId: "video-1",
					sourceVideoTitle: "テスト動画1",
					createdBy: "user-1",
					createdByName: "ユーザー1",
					durationText: "10秒",
					relativeTimeText: "1日前",
					startTime: 10,
					endTime: 20,
					playCount: 5,
					likeCount: 2,
					dislikeCount: 0,
					favoriteCount: 0,
					isPublic: true,
					createdAt: "2024-01-01T00:00:00Z",
					updatedAt: "2024-01-01T00:00:00Z",
				},
				{
					id: "audio-2",
					title: "テスト音声ボタン2",
					description: "説明2",
					tags: ["音楽"],
					sourceVideoId: "video-2",
					sourceVideoTitle: "テスト動画2",
					createdBy: "user-2",
					createdByName: "ユーザー2",
					durationText: "15秒",
					relativeTimeText: "2日前",
					startTime: 30,
					endTime: 45,
					playCount: 8,
					likeCount: 3,
					dislikeCount: 0,
					favoriteCount: 0,
					isPublic: true,
					createdAt: "2024-01-02T00:00:00Z",
					updatedAt: "2024-01-02T00:00:00Z",
				},
			],
			hasMore: false,
			totalCount: 2,
		},
	}),
}));

// Mock AudioButton component
vi.mock("@suzumina.click/ui/components/custom/audio-button", () => ({
	AudioButton: ({ audioButton }: any) => (
		<div data-testid="audio-button">
			<h3>{audioButton.title}</h3>
			<p>{audioButton.description}</p>
			<span>Tags: {audioButton.tags?.join(", ")}</span>
		</div>
	),
}));

// Mock next-auth to avoid import errors
vi.mock("next-auth/react", () => ({
	useSession: vi.fn(() => ({ data: null, status: "unauthenticated" })),
	SessionProvider: ({ children }: any) => children,
}));

// Mock AudioButtonsList component
vi.mock("../components/AudioButtonsList", () => ({
	default: () => {
		return (
			<div data-testid="audio-buttons-list">
				<div data-testid="simple-audio-button">
					<h4>テストサウンド1</h4>
					<p>説明1</p>
					<span>Tags: テスト</span>
				</div>
				<div data-testid="simple-audio-button">
					<h4>テストサウンド2</h4>
					<p>説明2</p>
					<span>Tags: 音楽</span>
				</div>
			</div>
		);
	},
}));

// Mock skeleton component
vi.mock("./components/AudioButtonsListSkeleton", () => ({
	AudioButtonsListSkeleton: () => <div data-testid="audio-buttons-list-skeleton">Loading...</div>,
}));

// Mock Pagination component
vi.mock("@/components/pagination/url-pagination", () => ({
	default: ({ currentPage, totalPages }: any) => (
		<div data-testid="pagination">
			Pagination: {currentPage} / {totalPages}
		</div>
	),
}));

// Mock Next.js navigation
vi.mock("next/navigation", () => ({
	useSearchParams: () => ({
		get: vi.fn(() => null),
	}),
}));

describe("AudioButtonsPage", () => {
	// 基本的なページレンダリングテストは統合テストに移行済み

	// 検索クエリテストは統合テストに移行済み

	// 空状態テストは統合テストに移行済み

	// エラー状態テストは統合テストに移行済み

	// ページネーションテストは統合テストに移行済み

	it("基本的なレンダリングが動作する", async () => {
		const searchParams = { page: "1", q: "", category: "", sort: "newest" };

		render(await AudioButtonsPage({ searchParams }));

		const list = screen.getByTestId("audio-buttons-list");
		expect(list).toBeInTheDocument();
	});

	it("検索パラメータがServer Actionに正しく渡される", async () => {
		const { getAudioButtonsList } = await import("../actions");
		const searchParams = { page: "2", q: "テスト検索", category: "", sort: "newest" };

		render(await AudioButtonsPage({ searchParams }));

		expect(getAudioButtonsList).toHaveBeenCalledWith(
			expect.objectContaining({
				page: 2,
				search: "テスト検索",
				sortBy: "newest",
			}),
		);
	});
});
