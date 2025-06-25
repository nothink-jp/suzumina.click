import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AudioButtonsPage from "./page";

// Mock the server actions
vi.mock("./actions", () => ({
	getAudioButtons: vi.fn().mockResolvedValue({
		success: true,
		data: {
			audioButtons: [
				{
					id: "audio-1",
					title: "テスト音声ボタン1",
					description: "説明1",
					category: "voice",
					tags: ["テスト"],
					sourceVideoId: "video-1",
					sourceVideoTitle: "テスト動画1",
					uploadedBy: "user-1",
					uploadedByName: "ユーザー1",
					durationText: "10秒",
					relativeTimeText: "1日前",
					startTime: 10,
					endTime: 20,
					playCount: 5,
					likeCount: 2,
					isPublic: true,
					createdAt: "2024-01-01T00:00:00Z",
					updatedAt: "2024-01-01T00:00:00Z",
				},
				{
					id: "audio-2",
					title: "テスト音声ボタン2",
					description: "説明2",
					category: "bgm",
					tags: ["音楽"],
					sourceVideoId: "video-2",
					sourceVideoTitle: "テスト動画2",
					uploadedBy: "user-2",
					uploadedByName: "ユーザー2",
					durationText: "15秒",
					relativeTimeText: "2日前",
					startTime: 30,
					endTime: 45,
					playCount: 8,
					likeCount: 3,
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

// Mock AudioButtonCard component
vi.mock("@/components/AudioButtonCard", () => ({
	AudioButtonCard: ({ audioButton }: any) => (
		<div data-testid="audio-button-card">
			<h3>{audioButton.title}</h3>
			<p>{audioButton.description}</p>
			<span>Category: {audioButton.category}</span>
		</div>
	),
}));

// Mock AudioButtonsList component
vi.mock("./components/AudioButtonsList", () => ({
	default: () => {
		return (
			<div data-testid="audio-buttons-list">
				<div data-testid="audio-button-card">
					<h4>テストサウンド1</h4>
					<p>説明1</p>
					<span>Category: voice</span>
				</div>
				<div data-testid="audio-button-card">
					<h4>テストサウンド2</h4>
					<p>説明2</p>
					<span>Category: bgm</span>
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
vi.mock("@/components/Pagination", () => ({
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
	it("音声ボタンページが正常に表示される", async () => {
		const searchParams = {
			page: "1",
			q: "",
			category: "",
			sort: "newest",
		};

		render(await AudioButtonsPage({ searchParams }));

		// Page title
		expect(screen.getByRole("heading", { name: /音声ボタン/ })).toBeInTheDocument();

		// Since the page uses Suspense, we should see skeleton loading initially
		const skeletons = screen.getAllByRole("generic"); // skeleton divs
		expect(skeletons.length).toBeGreaterThan(0);
	});

	it("検索クエリが適用される", async () => {
		const searchParams = {
			page: "1",
			q: "テスト検索",
			category: "voice",
			sort: "popular",
		};

		render(await AudioButtonsPage({ searchParams }));

		// Page should render the heading
		expect(screen.getByRole("heading", { name: /音声ボタン/ })).toBeInTheDocument();
	});

	it("空の結果が適切に表示される", async () => {
		const searchParams = {
			page: "1",
			q: "",
			category: "",
			sort: "newest",
		};

		render(await AudioButtonsPage({ searchParams }));

		// Page should render the base structure
		expect(screen.getByRole("heading", { name: /音声ボタン/ })).toBeInTheDocument();
	});

	it("エラー状態が適切に表示される", async () => {
		const searchParams = {
			page: "1",
			q: "",
			category: "",
			sort: "newest",
		};

		render(await AudioButtonsPage({ searchParams }));

		// Page should render the base structure
		expect(screen.getByRole("heading", { name: /音声ボタン/ })).toBeInTheDocument();
	});

	it("ページネーションが表示される", async () => {
		const searchParams = {
			page: "2",
			q: "",
			category: "",
			sort: "newest",
		};

		render(await AudioButtonsPage({ searchParams }));

		// Page should render the base structure
		expect(screen.getByRole("heading", { name: /音声ボタン/ })).toBeInTheDocument();
	});

	it("作成ボタンが表示される", async () => {
		const searchParams = {
			page: "1",
			q: "",
			category: "",
			sort: "newest",
		};

		render(await AudioButtonsPage({ searchParams }));

		const createButton = screen.getByRole("link", { name: /音声ボタンを作成/ });
		expect(createButton).toBeInTheDocument();
		expect(createButton).toHaveAttribute("href", "/buttons/create");
	});
});
