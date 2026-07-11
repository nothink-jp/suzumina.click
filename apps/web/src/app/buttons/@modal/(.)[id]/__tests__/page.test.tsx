import type { AudioButton } from "@suzumina.click/shared-types";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import InterceptedAudioButtonPage from "../page";

vi.mock("@/app/buttons/actions", () => ({
	getAudioButtonById: vi.fn(),
	getAudioButtonsList: vi.fn(),
}));

vi.mock("next/navigation", () => ({
	useRouter: () => ({ back: vi.fn(), push: vi.fn(), refresh: vi.fn() }),
}));

// クイックビュー本体（client island ツリー）はモーダル配線の検証には不要
vi.mock("@/components/audio-button-detail/audio-button-quick-view", () => ({
	AudioButtonQuickView: ({ audioButton }: { audioButton: { buttonText: string } }) => (
		<div data-testid="quick-view">{audioButton.buttonText}</div>
	),
}));

vi.mock("@/components/audio/audio-button-with-play-count", () => ({
	AudioButtonWithPlayCount: ({ audioButton }: { audioButton: { buttonText: string } }) => (
		<div data-testid="related-button">{audioButton.buttonText}</div>
	),
}));

import { getAudioButtonById, getAudioButtonsList } from "@/app/buttons/actions";

const mockGet = vi.mocked(getAudioButtonById);
const mockList = vi.mocked(getAudioButtonsList);

function makeButton(id: string, buttonText: string): AudioButton {
	return {
		id,
		buttonText,
		videoId: "v1",
		videoTitle: "テスト動画",
		videoThumbnailUrl: "https://example.com/thumb.jpg",
		startTime: 10,
		endTime: 13.4,
		duration: 3.4,
		creatorId: "u1",
		creatorName: "作成者",
		isPublic: true,
		tags: [],
		stats: { playCount: 0, likeCount: 0, dislikeCount: 0, favoriteCount: 0, engagementRate: 0 },
		createdAt: "2026-06-26T00:00:00.000Z",
		updatedAt: "2026-06-26T00:00:00.000Z",
		_computed: {
			isPopular: false,
			engagementRate: 0,
			engagementRatePercentage: 0,
			popularityScore: 0,
			searchableText: buttonText,
			durationText: "3.4秒",
			relativeTimeText: "1日前",
		},
	} as AudioButton;
}

describe("InterceptedAudioButtonPage", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockList.mockResolvedValue({
			success: true,
			data: { audioButtons: [], totalCount: 0, hasMore: false },
		} as Awaited<ReturnType<typeof getAudioButtonsList>>);
	});

	it("取得成功時はクイックビューと元動画ミニカードをモーダルに描画する", async () => {
		mockGet.mockResolvedValue({
			success: true,
			data: makeButton("abc123", "テストボタン"),
		} as Awaited<ReturnType<typeof getAudioButtonById>>);

		render(await InterceptedAudioButtonPage({ params: Promise.resolve({ id: "abc123" }) }));

		expect(screen.getByTestId("quick-view")).toHaveTextContent("テストボタン");
		expect(screen.getByText("元動画")).toBeInTheDocument();
		expect(screen.getByRole("link", { name: /ページで開く/ })).toHaveAttribute(
			"href",
			"/buttons/abc123",
		);
	});

	it("この動画の他のボタンは現在のボタンを除外して最大3件表示する", async () => {
		mockGet.mockResolvedValue({
			success: true,
			data: makeButton("current", "現在のボタン"),
		} as Awaited<ReturnType<typeof getAudioButtonById>>);
		mockList.mockResolvedValue({
			success: true,
			data: {
				audioButtons: [
					makeButton("current", "現在のボタン"),
					makeButton("b1", "ボタン1"),
					makeButton("b2", "ボタン2"),
					makeButton("b3", "ボタン3"),
				],
				totalCount: 4,
				hasMore: false,
			},
		} as Awaited<ReturnType<typeof getAudioButtonsList>>);

		render(await InterceptedAudioButtonPage({ params: Promise.resolve({ id: "current" }) }));

		expect(screen.getByText("この動画の他のボタン")).toBeInTheDocument();
		const relatedButtons = screen.getAllByTestId("related-button");
		expect(relatedButtons).toHaveLength(3);
		expect(screen.queryAllByTestId("related-button").map((e) => e.textContent)).not.toContain(
			"現在のボタン",
		);
	});

	it("取得失敗（success=false）時は null を返しモーダルを重ねない", async () => {
		mockGet.mockResolvedValue({ success: false, error: "not found" } as Awaited<
			ReturnType<typeof getAudioButtonById>
		>);

		const element = await InterceptedAudioButtonPage({
			params: Promise.resolve({ id: "missing" }),
		});
		expect(element).toBeNull();
	});

	it("取得が reject しても throw せず null を返す", async () => {
		mockGet.mockRejectedValue(new Error("firestore down"));

		const element = await InterceptedAudioButtonPage({
			params: Promise.resolve({ id: "abc123" }),
		});
		expect(element).toBeNull();
	});

	it("関連取得が失敗してもクイックビューは表示される", async () => {
		mockGet.mockResolvedValue({
			success: true,
			data: makeButton("abc123", "テストボタン"),
		} as Awaited<ReturnType<typeof getAudioButtonById>>);
		mockList.mockRejectedValue(new Error("firestore down"));

		render(await InterceptedAudioButtonPage({ params: Promise.resolve({ id: "abc123" }) }));

		expect(screen.getByTestId("quick-view")).toBeInTheDocument();
		expect(screen.queryByText("この動画の他のボタン")).not.toBeInTheDocument();
	});
});
