import type { AudioButtonPlainObject } from "@suzumina.click/shared-types";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ButtonsViewNav } from "../buttons-view-nav";
import { FeaturedAudioButtons } from "../featured-audio-buttons";
import { GroupedButtonsView } from "../grouped-buttons-view";

vi.mock("@/components/audio/audio-button-with-play-count", () => ({
	AudioButtonWithPlayCount: ({ audioButton }: { audioButton: { buttonText: string } }) => (
		<div data-testid="audio-button">{audioButton.buttonText}</div>
	),
}));
vi.mock("@/hooks/use-favorite-status-bulk", () => ({
	useFavoriteStatusBulk: () => ({ favoriteStates: new Map([["b1", true]]) }),
}));
vi.mock("@/hooks/use-like-dislike-status-bulk", () => ({
	useLikeDislikeStatusBulk: () => ({
		likeDislikeStates: new Map([["b1", { isLiked: true, isDisliked: false }]]),
	}),
}));

function makeButton(id: string, buttonText: string, playCount = 0): AudioButtonPlainObject {
	return {
		id,
		buttonText,
		videoId: "v1",
		videoTitle: "テスト動画",
		startTime: 0,
		endTime: 1,
		duration: 1,
		tags: [],
		creatorId: "u1",
		creatorName: "作成者",
		isPublic: true,
		stats: { playCount, likeCount: 0, dislikeCount: 0, favoriteCount: 0, engagementRate: 0 },
		createdAt: "2026-07-01T00:00:00.000Z",
		updatedAt: "2026-07-01T00:00:00.000Z",
		_computed: {
			isPopular: false,
			engagementRate: 0,
			engagementRatePercentage: 0,
			popularityScore: 0,
			searchableText: buttonText,
			durationText: "1秒",
			relativeTimeText: "1日前",
		},
	} as AudioButtonPlainObject;
}

describe("ButtonsViewNav", () => {
	it("3ビューのリンクを表示し、現在ビューに aria-current を付ける", () => {
		render(<ButtonsViewNav currentView="usage" />);

		expect(screen.getByRole("link", { name: "すべて" })).toHaveAttribute("href", "/buttons");
		expect(screen.getByRole("link", { name: "用途別" })).toHaveAttribute(
			"href",
			"/buttons?view=usage",
		);
		expect(screen.getByRole("link", { name: "動画ごと" })).toHaveAttribute(
			"href",
			"/buttons?view=video",
		);
		expect(screen.getByRole("link", { name: "用途別" })).toHaveAttribute("aria-current", "page");
		expect(screen.getByRole("link", { name: "すべて" })).not.toHaveAttribute("aria-current");
	});

	it("公式語彙9カテゴリのチップを表示し、絞り込み中のタグを active にする", () => {
		render(<ButtonsViewNav currentView="all" activeTags={["笑い"]} />);

		const chip = screen.getByRole("link", { name: "笑い" });
		expect(chip).toHaveAttribute("href", `/buttons?tags=${encodeURIComponent("笑い")}`);
		expect(chip.className).toContain("bg-suzuka-500");
		expect(screen.getByRole("link", { name: "あいさつ" }).className).not.toContain("bg-suzuka-500");
		expect(screen.getByRole("link", { name: "名言・迷言" })).toBeInTheDocument();
	});
});

describe("GroupedButtonsView", () => {
	it("グループカードに見出し・件数・もっと見る・丸め注記を表示する", () => {
		render(
			<GroupedButtonsView
				heading="用途別のボタン"
				totalCount={5}
				groups={[
					{
						key: "笑い",
						title: "笑い",
						total: 5,
						buttons: [makeButton("b1", "ボタン1"), makeButton("b2", "ボタン2")],
						moreHref: "/buttons?tags=笑い",
					},
				]}
			/>,
		);

		expect(screen.getByRole("heading", { name: "用途別のボタン" })).toBeInTheDocument();
		expect(screen.getByRole("heading", { name: "笑い" })).toBeInTheDocument();
		expect(screen.getAllByTestId("audio-button")).toHaveLength(2);
		expect(screen.getByRole("link", { name: "もっと見る →" })).toHaveAttribute(
			"href",
			"/buttons?tags=笑い",
		);
		expect(screen.getByText("ほか 3 件は「もっと見る」から")).toBeInTheDocument();
	});

	it("動画ごとグループはサムネイルと「動画を見る」リンクを表示する", () => {
		render(
			<GroupedButtonsView
				heading="動画ごとのボタン"
				totalCount={1}
				groups={[
					{
						key: "v1",
						title: "テスト動画",
						total: 1,
						buttons: [makeButton("b1", "ボタン1")],
						thumbnailUrl: "https://example.com/t.jpg",
						videoHref: "/videos/v1",
					},
				]}
			/>,
		);

		expect(screen.getByRole("img", { name: "テスト動画" })).toBeInTheDocument();
		expect(screen.getByRole("link", { name: "動画を見る" })).toHaveAttribute("href", "/videos/v1");
	});

	it("グループが空なら空状態メッセージを出す", () => {
		render(<GroupedButtonsView heading="用途別のボタン" totalCount={0} groups={[]} />);

		expect(screen.getByText("条件にあうボタンが見つかりませんでした")).toBeInTheDocument();
	});
});

describe("FeaturedAudioButtons", () => {
	it("よく押されてるボタンに再生数ラベル、新着ボタンに NEW バッジを表示する", () => {
		render(
			<FeaturedAudioButtons
				popular={[makeButton("b1", "人気ボタン", 42)]}
				fresh={[makeButton("b2", "新着ボタン")]}
			/>,
		);

		expect(screen.getByRole("heading", { name: "よく押されてるボタン" })).toBeInTheDocument();
		expect(screen.getByText("42回再生")).toBeInTheDocument();
		expect(screen.getByRole("heading", { name: "新着ボタン" })).toBeInTheDocument();
		expect(screen.getByText("NEW")).toBeInTheDocument();
	});

	it("両方空なら何も描画しない", () => {
		const { container } = render(<FeaturedAudioButtons popular={[]} fresh={[]} />);

		expect(container.firstChild).toBeNull();
	});
});
