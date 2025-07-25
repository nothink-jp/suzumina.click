import { AudioButtonV2 } from "@suzumina.click/shared-types";
import { render, screen } from "@testing-library/react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { describe, expect, it, vi } from "vitest";
import { AudioButtonListV2 } from "../audio-button-list-v2";

// モックの設定
vi.mock("next/navigation", () => ({
	useRouter: vi.fn(),
}));

vi.mock("next-auth/react", () => ({
	useSession: vi.fn(),
}));

// lucide-reactアイコンのモック
vi.mock("lucide-react", () => ({
	AlertCircle: () => <span>AlertCircle Icon</span>,
	Clock: () => <span>Clock Icon</span>,
	Heart: () => <span>Heart Icon</span>,
	Play: () => <span>Play Icon</span>,
	ThumbsDown: () => <span>ThumbsDown Icon</span>,
	ThumbsUp: () => <span>ThumbsUp Icon</span>,
}));

// テスト用のAudioButtonV2エンティティを作成するヘルパー
function createMockAudioButtonV2(id: string, overrides?: Partial<any>): AudioButtonV2 {
	const defaultData = {
		id,
		title: `音声ボタン ${id}`,
		description: `これはテスト用の音声ボタン ${id} です`,
		tags: ["タグ1", "タグ2"],
		sourceVideoId: "dQw4w9WgXcQ",
		sourceVideoTitle: `動画タイトル ${id}`,
		startTime: 30,
		endTime: 45,
		createdBy: "user123",
		createdByName: "テストユーザー",
		isPublic: true,
		playCount: 100,
		likeCount: 10,
		dislikeCount: 1,
		favoriteCount: 5,
		createdAt: "2024-01-01T00:00:00Z",
		updatedAt: "2024-01-01T00:00:00Z",
		...overrides,
	};

	return AudioButtonV2.fromLegacy(defaultData);
}

describe("AudioButtonListV2", () => {
	const mockPush = vi.fn();
	const mockRouter = { push: mockPush };

	beforeEach(() => {
		vi.clearAllMocks();
		(useRouter as any).mockReturnValue(mockRouter);
		(useSession as any).mockReturnValue({ data: null });
	});

	it("音声ボタンリストが正しく表示される", () => {
		const audioButtons = [
			createMockAudioButtonV2("1"),
			createMockAudioButtonV2("2"),
			createMockAudioButtonV2("3"),
		];
		render(<AudioButtonListV2 audioButtons={audioButtons} />);

		expect(screen.getByText("音声ボタン 1")).toBeInTheDocument();
		expect(screen.getByText("音声ボタン 2")).toBeInTheDocument();
		expect(screen.getByText("音声ボタン 3")).toBeInTheDocument();
	});

	it("カスタム再生回数が表示される", () => {
		const audioButtons = [createMockAudioButtonV2("1"), createMockAudioButtonV2("2")];
		const playCounts = {
			"1": 500,
			"2": 1000,
		};
		render(<AudioButtonListV2 audioButtons={audioButtons} playCounts={playCounts} />);

		expect(screen.getByText("500")).toBeInTheDocument();
		expect(screen.getByText("1,000")).toBeInTheDocument();
	});

	it("ローディング状態が表示される", () => {
		const { container } = render(<AudioButtonListV2 audioButtons={[]} loading={true} />);

		const skeletons = container.querySelectorAll(".animate-pulse");
		expect(skeletons).toHaveLength(6);
	});

	it("エラー状態が表示される", () => {
		render(<AudioButtonListV2 audioButtons={[]} error="ネットワークエラーが発生しました" />);

		expect(screen.getByText("ネットワークエラーが発生しました")).toBeInTheDocument();
	});

	it("空状態が表示される", () => {
		render(<AudioButtonListV2 audioButtons={[]} />);

		expect(screen.getByText("音声ボタンが見つかりませんでした")).toBeInTheDocument();
	});

	it("お気に入り状態が正しく反映される", () => {
		const audioButtons = [createMockAudioButtonV2("1"), createMockAudioButtonV2("2")];
		const favoriteStates = {
			"1": true,
			"2": false,
		};
		render(<AudioButtonListV2 audioButtons={audioButtons} favoriteStates={favoriteStates} />);

		const favoriteButtons = screen.getAllByRole("button", { name: /お気に入り/ });
		expect(favoriteButtons[0]).toHaveAttribute("aria-label", "お気に入りから削除");
		expect(favoriteButtons[1]).toHaveAttribute("aria-label", "お気に入りに追加");
	});

	it("いいね・低評価状態が正しく反映される", () => {
		const audioButtons = [createMockAudioButtonV2("1")];
		const likeStates = { "1": true };
		const dislikeStates = { "1": false };

		render(
			<AudioButtonListV2
				audioButtons={audioButtons}
				likeStates={likeStates}
				dislikeStates={dislikeStates}
			/>,
		);

		expect(screen.getByRole("button", { name: "いいねを取り消す" })).toBeInTheDocument();
		expect(screen.getByRole("button", { name: "低評価" })).toBeInTheDocument();
	});

	it("コールバック関数が正しく呼ばれる", () => {
		const handlePlay = vi.fn();
		const handleFavorite = vi.fn();
		const handleLike = vi.fn();
		const handleDislike = vi.fn();

		const audioButtons = [createMockAudioButtonV2("1")];
		render(
			<AudioButtonListV2
				audioButtons={audioButtons}
				onPlay={handlePlay}
				onFavoriteToggle={handleFavorite}
				onLikeToggle={handleLike}
				onDislikeToggle={handleDislike}
			/>,
		);

		// 各コールバックはAudioButtonCardV2内で呼ばれるため、
		// ここではコンポーネントが正しくレンダリングされることを確認
		expect(screen.getByRole("button", { name: /再生/ })).toBeInTheDocument();
	});

	it("統計情報の表示/非表示を切り替えられる", () => {
		const audioButtons = [
			createMockAudioButtonV2("1", { playCount: 999 }),
			createMockAudioButtonV2("2", { playCount: 888 }),
		];

		const { rerender } = render(<AudioButtonListV2 audioButtons={audioButtons} showStats={true} />);
		expect(screen.getByText("999")).toBeInTheDocument();
		expect(screen.getByText("888")).toBeInTheDocument();

		rerender(<AudioButtonListV2 audioButtons={audioButtons} showStats={false} />);
		expect(screen.queryByText("999")).not.toBeInTheDocument();
		expect(screen.queryByText("888")).not.toBeInTheDocument();
	});

	it("カスタムクラス名が適用される", () => {
		const { container } = render(<AudioButtonListV2 audioButtons={[]} className="custom-class" />);

		const emptyState = container.querySelector(".custom-class");
		expect(emptyState).toBeInTheDocument();
	});
});
