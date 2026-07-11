import type { AudioButton } from "@suzumina.click/shared-types";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RelatedAudioButtons } from "../related-audio-buttons";

vi.mock("@/app/buttons/actions", () => ({
	getAudioButtonsList: vi.fn(),
}));

// client leaf（session/router 依存）は表示検証に不要なのでボタン名だけ出すスタブに差し替える
vi.mock("@/components/audio/audio-button-with-play-count", () => ({
	AudioButtonWithPlayCount: ({ audioButton }: { audioButton: AudioButton }) => (
		<div data-testid="audio-button">{audioButton.buttonText}</div>
	),
}));

import { getAudioButtonsList } from "@/app/buttons/actions";

const mockList = vi.mocked(getAudioButtonsList);

function makeButton(id: string): AudioButton {
	return {
		id,
		buttonText: `ボタン${id}`,
		tags: [],
		videoId: "v1",
		videoTitle: "動画",
		startTime: 0,
		endTime: 1,
		duration: 1,
		creatorId: "u1",
		creatorName: "作成者",
		isPublic: true,
		stats: { playCount: 0, likeCount: 0, dislikeCount: 0, favoriteCount: 0, engagementRate: 0 },
		createdAt: "2026-01-01T00:00:00.000Z",
		updatedAt: "2026-01-01T00:00:00.000Z",
		_computed: {
			isPopular: false,
			engagementRate: 0,
			engagementRatePercentage: 0,
			popularityScore: 0,
			searchableText: "",
			durationText: "1.0秒",
			relativeTimeText: "1日前",
		},
	} as AudioButton;
}

function successResult(buttons: AudioButton[]) {
	return {
		success: true as const,
		data: { audioButtons: buttons, totalCount: buttons.length, hasMore: false },
	};
}

describe("RelatedAudioButtons", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("この動画のボタンから現在のボタンを除外して表示する", async () => {
		mockList.mockImplementation(async (query) => {
			if (query?.videoId) return successResult([makeButton("current"), makeButton("b1")]);
			return successResult([]);
		});

		render(await RelatedAudioButtons({ currentId: "current", videoId: "v1", tags: [] }));

		expect(screen.getByText("この動画のボタン")).toBeInTheDocument();
		expect(screen.getByText("ボタンb1")).toBeInTheDocument();
		expect(screen.queryByText("ボタンcurrent")).not.toBeInTheDocument();
	});

	it("同タグセクションは同一動画セクションと重複するボタンを出さない", async () => {
		mockList.mockImplementation(async (query) => {
			if (query?.videoId) return successResult([makeButton("b1")]);
			if (query?.tags) return successResult([makeButton("b1"), makeButton("b2")]);
			return successResult([]);
		});

		render(await RelatedAudioButtons({ currentId: "current", videoId: "v1", tags: ["タグA"] }));

		expect(screen.getByText("同じタグのボタン")).toBeInTheDocument();
		// b1 は同一動画側にのみ表示（重複排除）
		expect(screen.getAllByText("ボタンb1")).toHaveLength(1);
		expect(screen.getByText("ボタンb2")).toBeInTheDocument();
		// もっと見るリンクはタグを | 連結した一覧 URL を指す
		expect(screen.getByRole("link", { name: /同じタグのボタンをもっと見る/ })).toHaveAttribute(
			"href",
			`/buttons?tags=${encodeURIComponent("タグA")}`,
		);
	});

	it("tags が空なら同タグクエリを発行しない", async () => {
		mockList.mockResolvedValue(successResult([makeButton("b1")]));

		render(await RelatedAudioButtons({ currentId: "current", videoId: "v1", tags: [] }));

		expect(mockList).toHaveBeenCalledTimes(1);
		expect(mockList).toHaveBeenCalledWith(expect.objectContaining({ videoId: "v1" }));
	});

	it("同一動画・同タグとも空なら人気ボタンで受ける（行き止まり防止）", async () => {
		mockList.mockImplementation(async (query) => {
			if (query?.videoId || query?.tags) return successResult([]);
			return successResult([makeButton("pop1")]);
		});

		render(await RelatedAudioButtons({ currentId: "current", videoId: "v1", tags: ["タグA"] }));

		expect(screen.getByText("人気のボタン")).toBeInTheDocument();
		expect(screen.getByText("ボタンpop1")).toBeInTheDocument();
		expect(screen.getByRole("link", { name: /音声ボタン一覧を見る/ })).toHaveAttribute(
			"href",
			"/buttons",
		);
	});

	it("全セクション空なら null を返す", async () => {
		mockList.mockResolvedValue(successResult([]));

		const element = await RelatedAudioButtons({ currentId: "current", videoId: "v1", tags: [] });
		expect(element).toBeNull();
	});

	it("取得失敗はセクション空として継続する（throw しない）", async () => {
		mockList.mockRejectedValue(new Error("firestore down"));

		const element = await RelatedAudioButtons({ currentId: "current", videoId: "v1", tags: [] });
		expect(element).toBeNull();
	});

	it("各セクション最大12件に制限する", async () => {
		const many = Array.from({ length: 13 }, (_, i) => makeButton(`b${i}`));
		mockList.mockImplementation(async (query) => {
			if (query?.videoId) return successResult(many);
			return successResult([]);
		});

		render(await RelatedAudioButtons({ currentId: "current", videoId: "v1", tags: [] }));

		expect(screen.getAllByTestId("audio-button")).toHaveLength(12);
	});
});
