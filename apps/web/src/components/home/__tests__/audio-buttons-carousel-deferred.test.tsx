import type { AudioButtonPlainObject } from "@suzumina.click/shared-types";
import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AudioButtonsCarouselDeferred } from "../audio-buttons-carousel-deferred";

// FeaturedAudioButtonsCarousel をモック化して lazy() の resolve 内容を制御する。
// 実コンポーネントは better-auth client や Firestore action を含むため、
// 本テストでは defer ロジック (skeleton → lazy mount) のみを検証する。
vi.mock("@/components/audio/featured-audio-buttons-carousel", () => ({
	FeaturedAudioButtonsCarousel: ({ audioButtons }: { audioButtons: AudioButtonPlainObject[] }) => (
		<div data-testid="mocked-featured-carousel">
			<span data-testid="carousel-count">{audioButtons.length}</span>
			{audioButtons.map((b) => (
				<span key={b.id} data-testid="carousel-item">
					{b.buttonText}
				</span>
			))}
		</div>
	),
}));

const buildAudioButton = (id: string, title: string): AudioButtonPlainObject =>
	({
		id,
		buttonText: title,
		description: "",
		tags: [],
		sourceVideoId: "video-1",
		sourceVideoTitle: "video title",
		sourceVideoThumbnailUrl: "",
		startTime: 0,
		endTime: 1,
		createdBy: "user-1",
		createdByName: "user",
		isPublic: true,
		playCount: 0,
		likeCount: 0,
		dislikeCount: 0,
		favoriteCount: 0,
		createdAt: "2026-01-01T00:00:00Z",
		updatedAt: "2026-01-01T00:00:00Z",
		_computed: {
			isPopular: false,
			engagementRate: 0,
			engagementRatePercentage: 0,
			popularityScore: 0,
			searchableText: title,
			durationText: "1秒",
			relativeTimeText: "今",
		},
	}) as unknown as AudioButtonPlainObject;

describe("AudioButtonsCarouselDeferred", () => {
	const audioButtons = [buildAudioButton("a-1", "テスト1"), buildAudioButton("a-2", "テスト2")];

	it("初期 render (mounted=false 相当) で skeleton を返す", () => {
		render(<AudioButtonsCarouselDeferred audioButtons={audioButtons} />);

		// LoadingSkeleton variant="carousel" の testid
		expect(screen.getByTestId("loading-skeleton-carousel")).toBeInTheDocument();
		// この時点ではまだ lazy 対象は load されていない
		expect(screen.queryByTestId("mocked-featured-carousel")).not.toBeInTheDocument();
	});

	it("useEffect 発火後に lazy chunk が load され、実 carousel が render される", async () => {
		render(<AudioButtonsCarouselDeferred audioButtons={audioButtons} />);

		// useEffect が発火し mounted=true → Suspense fallback → lazy resolve の順で
		// 最終的に mocked carousel が現れる
		await waitFor(() => {
			expect(screen.getByTestId("mocked-featured-carousel")).toBeInTheDocument();
		});

		// audioButtons prop が正しく渡されることを確認
		expect(screen.getByTestId("carousel-count")).toHaveTextContent("2");
		const items = screen.getAllByTestId("carousel-item");
		expect(items).toHaveLength(2);
		expect(items[0]).toHaveTextContent("テスト1");
		expect(items[1]).toHaveTextContent("テスト2");
	});

	// Note: 初期 skeleton の存在チェックは test 1 で網羅済み。本 test では
	// lazy() の module キャッシュが先行 test で温まると skeleton phase を
	// 観測できないため、final 状態のみを検証する。
	it("audioButtons が空配列でも lazy resolve 後の carousel が render される", async () => {
		render(<AudioButtonsCarouselDeferred audioButtons={[]} />);

		await waitFor(() => {
			expect(screen.getByTestId("mocked-featured-carousel")).toBeInTheDocument();
		});
		expect(screen.getByTestId("carousel-count")).toHaveTextContent("0");
	});
});
