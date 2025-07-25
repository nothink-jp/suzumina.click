import { AudioButtonV2 } from "@suzumina.click/shared-types";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { describe, expect, it, vi } from "vitest";
import AudioButtonCardV2 from "../audio-button-card-v2";

// モックの設定
vi.mock("next/navigation", () => ({
	useRouter: vi.fn(),
}));

vi.mock("next-auth/react", () => ({
	useSession: vi.fn(),
}));

// lucide-reactアイコンのモック
vi.mock("lucide-react", () => ({
	Clock: () => <span>Clock Icon</span>,
	Heart: () => <span>Heart Icon</span>,
	Play: () => <span>Play Icon</span>,
	ThumbsDown: () => <span>ThumbsDown Icon</span>,
	ThumbsUp: () => <span>ThumbsUp Icon</span>,
}));

// テスト用のAudioButtonV2エンティティを作成するヘルパー
function createMockAudioButtonV2(overrides?: Partial<any>): AudioButtonV2 {
	const defaultData = {
		id: "test-button-123",
		title: "テスト音声ボタン",
		description: "これはテスト用の音声ボタンです",
		tags: ["タグ1", "タグ2"],
		sourceVideoId: "dQw4w9WgXcQ",
		sourceVideoTitle: "テスト動画タイトル",
		startTime: 30,
		endTime: 45,
		createdBy: "user123",
		createdByName: "テストユーザー",
		isPublic: true,
		playCount: 1234,
		likeCount: 100,
		dislikeCount: 5,
		favoriteCount: 50,
		createdAt: "2024-01-01T00:00:00Z",
		updatedAt: "2024-01-01T00:00:00Z",
		...overrides,
	};

	return AudioButtonV2.fromLegacy(defaultData);
}

describe("AudioButtonCardV2", () => {
	const mockPush = vi.fn();
	const mockRouter = { push: mockPush };

	beforeEach(() => {
		vi.clearAllMocks();
		(useRouter as any).mockReturnValue(mockRouter);
		(useSession as any).mockReturnValue({ data: null });
	});

	it("音声ボタンの基本情報が表示される", () => {
		const audioButton = createMockAudioButtonV2();
		render(<AudioButtonCardV2 audioButton={audioButton} />);

		expect(screen.getByText("テスト音声ボタン")).toBeInTheDocument();
		expect(screen.getByText("テスト動画タイトル")).toBeInTheDocument();
		expect(screen.getByText("作成者: テストユーザー")).toBeInTheDocument();
	});

	it("公開/非公開バッジが正しく表示される", () => {
		const publicButton = createMockAudioButtonV2({ isPublic: true });
		const { rerender } = render(<AudioButtonCardV2 audioButton={publicButton} />);
		expect(screen.getByText("公開")).toBeInTheDocument();

		const privateButton = createMockAudioButtonV2({ isPublic: false });
		rerender(<AudioButtonCardV2 audioButton={privateButton} />);
		expect(screen.getByText("非公開")).toBeInTheDocument();
	});

	it("タイムスタンプと再生時間が表示される", () => {
		const audioButton = createMockAudioButtonV2({
			startTime: 60,
			endTime: 90,
		});
		render(<AudioButtonCardV2 audioButton={audioButton} />);

		expect(screen.getByText("1:00 - 1:30")).toBeInTheDocument();
		expect(screen.getByText("0:30")).toBeInTheDocument(); // 再生時間
	});

	it("タグが表示され、クリックできる", async () => {
		const user = userEvent.setup();
		const audioButton = createMockAudioButtonV2();
		render(<AudioButtonCardV2 audioButton={audioButton} />);

		const tag1 = screen.getByText("タグ1");
		expect(tag1).toBeInTheDocument();

		await user.click(tag1);
		expect(mockPush).toHaveBeenCalledWith(
			"/search?q=%E3%82%BF%E3%82%B01&type=audioButtons&tags=%E3%82%BF%E3%82%B01",
		);
	});

	it("統計情報が表示される", () => {
		const audioButton = createMockAudioButtonV2({
			playCount: 123456,
			likeCount: 1234,
		});
		render(<AudioButtonCardV2 audioButton={audioButton} />);

		expect(screen.getByText("123,456")).toBeInTheDocument();
		expect(screen.getByText("1,234")).toBeInTheDocument();
	});

	it("統計情報を非表示にできる", () => {
		const audioButton = createMockAudioButtonV2({
			playCount: 123456,
			likeCount: 1234,
		});
		render(<AudioButtonCardV2 audioButton={audioButton} showStats={false} />);

		expect(screen.queryByText("123,456")).not.toBeInTheDocument();
		expect(screen.queryByText("1,234")).not.toBeInTheDocument();
	});

	it("再生ボタンがクリックできる", async () => {
		const user = userEvent.setup();
		const handlePlay = vi.fn();
		const audioButton = createMockAudioButtonV2();
		render(<AudioButtonCardV2 audioButton={audioButton} onPlay={handlePlay} />);

		const playButton = screen.getByRole("button", { name: /再生/ });
		await user.click(playButton);

		expect(handlePlay).toHaveBeenCalled();
	});

	it("ログインしていない場合、アクションボタンが無効になる", () => {
		const audioButton = createMockAudioButtonV2();
		render(<AudioButtonCardV2 audioButton={audioButton} />);

		expect(screen.getByRole("button", { name: "お気に入りに追加" })).toBeDisabled();
		expect(screen.getByRole("button", { name: "いいね" })).toBeDisabled();
		expect(screen.getByRole("button", { name: "低評価" })).toBeDisabled();
	});

	it("ログインしている場合、アクションボタンが有効になる", () => {
		(useSession as any).mockReturnValue({
			data: { user: { id: "user123", name: "テストユーザー" } },
		});

		const audioButton = createMockAudioButtonV2();
		render(<AudioButtonCardV2 audioButton={audioButton} />);

		expect(screen.getByRole("button", { name: "お気に入りに追加" })).toBeEnabled();
		expect(screen.getByRole("button", { name: "いいね" })).toBeEnabled();
		expect(screen.getByRole("button", { name: "低評価" })).toBeEnabled();
	});

	it("お気に入りボタンのトグル状態が正しく表示される", () => {
		(useSession as any).mockReturnValue({
			data: { user: { id: "user123", name: "テストユーザー" } },
		});

		const audioButton = createMockAudioButtonV2();
		const { rerender } = render(
			<AudioButtonCardV2 audioButton={audioButton} isFavorited={false} />,
		);

		expect(screen.getByRole("button", { name: "お気に入りに追加" })).toBeInTheDocument();

		rerender(<AudioButtonCardV2 audioButton={audioButton} isFavorited={true} />);
		expect(screen.getByRole("button", { name: "お気に入りから削除" })).toBeInTheDocument();
	});

	it("アクションボタンのコールバックが呼ばれる", async () => {
		const user = userEvent.setup();
		(useSession as any).mockReturnValue({
			data: { user: { id: "user123", name: "テストユーザー" } },
		});

		const handleFavorite = vi.fn();
		const handleLike = vi.fn();
		const handleDislike = vi.fn();

		const audioButton = createMockAudioButtonV2();
		render(
			<AudioButtonCardV2
				audioButton={audioButton}
				onFavoriteToggle={handleFavorite}
				onLikeToggle={handleLike}
				onDislikeToggle={handleDislike}
			/>,
		);

		await user.click(screen.getByRole("button", { name: "お気に入りに追加" }));
		expect(handleFavorite).toHaveBeenCalled();

		await user.click(screen.getByRole("button", { name: "いいね" }));
		expect(handleLike).toHaveBeenCalled();

		await user.click(screen.getByRole("button", { name: "低評価" }));
		expect(handleDislike).toHaveBeenCalled();
	});

	it("YouTubeリンクが正しく設定される", () => {
		const audioButton = createMockAudioButtonV2({
			sourceVideoId: "dQw4w9WgXcQ",
			startTime: 120,
		});
		render(<AudioButtonCardV2 audioButton={audioButton} />);

		const link = screen.getByRole("link", { name: "テスト動画タイトル" });
		expect(link).toHaveAttribute("href", "https://youtube.com/watch?v=dQw4w9WgXcQ&t=120");
		expect(link).toHaveAttribute("target", "_blank");
		expect(link).toHaveAttribute("rel", "noopener noreferrer");
	});
});
