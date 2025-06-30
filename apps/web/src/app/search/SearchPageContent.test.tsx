import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SearchPageContent from "./SearchPageContent";

// Mock dependencies
const mockPush = vi.fn();
const mockReplace = vi.fn();
const mockGet = vi.fn();

vi.mock("next/navigation", () => ({
	useRouter: () => ({
		push: mockPush,
		replace: mockReplace,
	}),
	useSearchParams: () => ({
		get: mockGet,
	}),
}));

// Mock UI components with minimal functionality
vi.mock("@suzumina.click/ui/components/ui/badge", () => ({
	Badge: ({ children, onClick, className }: any) => (
		<button type="button" className={className} onClick={onClick} data-testid="badge">
			{children}
		</button>
	),
}));

vi.mock("@suzumina.click/ui/components/ui/button", () => ({
	Button: ({ children, onClick, disabled, type, "data-testid": testId, ...props }: any) => (
		<button
			onClick={onClick}
			disabled={disabled}
			type={type}
			data-testid={testId || "button"}
			{...props}
		>
			{children}
		</button>
	),
}));

vi.mock("@suzumina.click/ui/components/ui/input", () => ({
	Input: ({ "data-testid": testId, ...props }: any) => (
		<input data-testid={testId || "input"} {...props} />
	),
}));

vi.mock("@suzumina.click/ui/components/ui/card", () => ({
	Card: ({ children, className }: any) => <div className={className}>{children}</div>,
	CardContent: ({ children, className }: any) => <div className={className}>{children}</div>,
	CardHeader: ({ children }: any) => <div>{children}</div>,
	CardTitle: ({ children }: any) => <h3>{children}</h3>,
}));

vi.mock("@suzumina.click/ui/components/ui/tabs", () => ({
	Tabs: ({ children, value }: any) => (
		<div data-testid="tabs" data-value={value}>
			{children}
		</div>
	),
	TabsList: ({ children }: any) => <div data-testid="tabs-list">{children}</div>,
	TabsTrigger: ({ children, value, onClick }: any) => (
		<button type="button" data-testid={`tab-${value}`} onClick={() => onClick?.(value)}>
			{children}
		</button>
	),
	TabsContent: ({ children, value }: any) => (
		<div data-testid={`tab-content-${value}`}>{children}</div>
	),
}));

vi.mock("lucide-react", () => ({
	Search: ({ className }: any) => <div className={className} data-testid="search-icon" />,
	Filter: ({ className }: any) => <div className={className} data-testid="filter-icon" />,
	Loader2: ({ className }: any) => <div className={className} data-testid="loader-icon" />,
	Music: ({ className }: any) => <div className={className} data-testid="music-icon" />,
	Video: ({ className }: any) => <div className={className} data-testid="video-icon" />,
	BookOpen: ({ className }: any) => <div className={className} data-testid="book-icon" />,
	ChevronRight: ({ className }: any) => <div className={className} data-testid="chevron-icon" />,
}));

vi.mock("@/components/AudioButtonWithFavoriteClient", () => ({
	AudioButtonWithFavoriteClient: ({ audioButton }: any) => (
		<div data-testid="audio-button" data-id={audioButton.id}>
			{audioButton.title}
		</div>
	),
}));

vi.mock("@/components/ThumbnailImage", () => ({
	default: ({ src, alt }: any) => <div data-testid="thumbnail" data-src={src} data-alt={alt} />,
}));

vi.mock("next/link", () => ({
	default: ({ children, href }: any) => (
		<a href={href} data-testid="link">
			{children}
		</a>
	),
}));

describe("SearchPageContent", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockGet.mockReturnValue(null);
		global.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: () =>
				Promise.resolve({
					audioButtons: [],
					videos: [],
					works: [],
					totalCount: { buttons: 0, videos: 0, works: 0 },
					hasMore: { buttons: false, videos: false, works: false },
				}),
		});
	});

	describe("初期状態", () => {
		it("検索前の状態が正しく表示される", () => {
			render(<SearchPageContent />);

			expect(screen.getByText("検索結果")).toBeInTheDocument();
			expect(screen.getByText("音声ボタンや作品を検索")).toBeInTheDocument();
			expect(
				screen.getByText("キーワードを入力して、お気に入りのコンテンツを見つけましょう"),
			).toBeInTheDocument();
		});

		it("人気タグが表示される", () => {
			render(<SearchPageContent />);

			expect(screen.getByText("人気タグ")).toBeInTheDocument();
			expect(screen.getAllByText("挨拶")).toHaveLength(2); // 検索フォーム内とメイン部分で2回表示
			expect(screen.getAllByText("応援")).toHaveLength(2);
			expect(screen.getAllByText("感謝")).toHaveLength(2);
		});

		it("検索フォームが表示される", () => {
			render(<SearchPageContent />);

			expect(screen.getByTestId("search-input")).toBeInTheDocument();
			expect(screen.getByTestId("search-button")).toBeInTheDocument();
		});
	});

	describe("検索機能", () => {
		it("人気タグクリックで検索が実行される", async () => {
			const user = userEvent.setup();
			render(<SearchPageContent />);

			// 最初の挨拶タグをクリック
			const greetingTags = screen.getAllByText("挨拶");
			await user.click(greetingTags[0]);

			await waitFor(
				() => {
					expect(global.fetch).toHaveBeenCalled();
				},
				{ timeout: 3000 },
			);
		});

		it("空の検索が防止される", async () => {
			const user = userEvent.setup();
			render(<SearchPageContent />);

			const searchButton = screen.getByTestId("search-button");
			await user.click(searchButton);

			// 空の検索では fetch が呼ばれない
			expect(global.fetch).not.toHaveBeenCalled();
		});
	});

	describe("URL更新", () => {
		it("検索クエリが空の場合URLがクリアされる", async () => {
			const user = userEvent.setup();
			render(<SearchPageContent />);

			// 空の検索でformを送信
			await user.click(screen.getByTestId("search-button"));

			// 空の検索はクリアするため、/searchにリダイレクト
			expect(mockReplace).toHaveBeenCalledWith("/search");
		});
	});

	describe("アクセシビリティ", () => {
		it("検索フォームにプロパーなラベルが設定されている", () => {
			render(<SearchPageContent />);

			const searchInput = screen.getByTestId("search-input");
			expect(searchInput).toHaveAttribute("placeholder", "ボタンや作品を検索...");
		});
	});
});
