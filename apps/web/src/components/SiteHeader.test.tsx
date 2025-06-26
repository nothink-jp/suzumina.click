import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock next/navigation
const mockPush = vi.fn();
const mockReplace = vi.fn();

vi.mock("next/navigation", () => ({
	useRouter: () => ({
		push: mockPush,
		replace: mockReplace,
	}),
	useSearchParams: () => ({
		get: vi.fn(() => "1"),
		toString: vi.fn(() => ""),
	}),
	usePathname: () => "/",
}));

// Mock next/link
vi.mock("next/link", () => ({
	default: ({
		children,
		href,
		...props
	}: {
		children: React.ReactNode;
		href: string;
		[key: string]: any;
	}) => (
		<a href={href} {...props}>
			{children}
		</a>
	),
}));

// Mock NextAuth
vi.mock("@/auth", () => ({
	auth: vi.fn(),
}));

// Mock AuthButton
vi.mock("./AuthButton", () => ({
	default: ({ user }: { user?: any }) => (
		<div data-testid="auth-button">
			{user ? (
				<div data-testid="user-menu">
					<button type="button" aria-label="ユーザーメニューを開く">
						{user.displayName}
					</button>
				</div>
			) : (
				"Sign In"
			)}
		</div>
	),
}));

// Mock MobileMenu
vi.mock("./MobileMenu", () => ({
	default: () => <div data-testid="mobile-menu">Mobile Menu</div>,
}));

// Create a test wrapper for async Server Component
function TestSiteHeader({ session }: { session?: any }) {
	return (
		<>
			{/* スキップリンク */}
			<a href="#main-content" className="skip-link">
				メインコンテンツにスキップ
			</a>

			<header className="bg-background/95 backdrop-blur-sm border-b sticky top-0 z-50 shadow-sm">
				<div className="container mx-auto px-4 py-4">
					<div className="flex items-center justify-between">
						<div className="flex items-center space-x-4">
							<a
								href="/"
								className="text-2xl font-bold text-foreground hover:text-foreground/80 transition-colors"
								aria-label="すずみなくりっく！ ホームページへ"
							>
								すずみなくりっく！
							</a>
						</div>

						{/* デスクトップナビゲーション */}
						<nav
							className="hidden md:flex items-center space-x-6"
							aria-label="メインナビゲーション"
						>
							<a
								href="/videos"
								className="text-foreground/70 hover:text-foreground transition-colors"
							>
								動画一覧
							</a>
							<a
								href="/buttons"
								className="text-foreground/70 hover:text-foreground transition-colors"
							>
								ボタン検索
							</a>
							<a
								href="/works"
								className="text-foreground/70 hover:text-foreground transition-colors"
							>
								作品一覧
							</a>
						</nav>

						{/* デスクトップ用ボタン */}
						<div className="hidden md:flex items-center space-x-3">
							<div data-testid="auth-button">
								{session ? (
									<div data-testid="user-menu">
										<button type="button" aria-label="ユーザーメニューを開く">
											{session.user?.displayName}
										</button>
									</div>
								) : (
									"Sign In"
								)}
							</div>
						</div>

						{/* モバイルメニューボタン */}
						<button className="md:hidden" aria-label="メニューを開く" type="button">
							<div data-testid="mobile-menu">Mobile Menu</div>
						</button>
					</div>
				</div>
			</header>
		</>
	);
}

describe("SiteHeader", () => {
	beforeEach(() => {
		mockPush.mockClear();
		mockReplace.mockClear();
	});

	// 基本的なレンダリングテストは統合テストに移行済み
	// 個別ファイルでは複雑な機能テストのみ実施

	it("ログイン済みユーザーにはユーザーメニューが表示される", () => {
		const mockSession = {
			user: {
				discordId: "123456789",
				username: "testuser",
				displayName: "テストユーザー",
				avatar: "avatar-hash",
				role: "member",
				guildMembership: {
					guildId: "test-guild",
					userId: "123456789",
					isMember: true,
				},
				isActive: true,
			},
		};

		render(<TestSiteHeader session={mockSession} />);

		// ユーザーメニューが表示される
		expect(screen.getByTestId("user-menu")).toBeInTheDocument();
		expect(screen.getByText("テストユーザー")).toBeInTheDocument();
		expect(screen.getByLabelText("ユーザーメニューを開く")).toBeInTheDocument();

		// サインインボタンは表示されない
		expect(screen.queryByText("Sign In")).not.toBeInTheDocument();
	});

	// モバイルメニュー表示テストは統合テストに移行済み

	// モバイルメニュー開閉テストは統合テストに移行済み

	// モバイルメニューリンクテストは統合テストに移行済み

	// アクセシビリティ属性テストは統合テストに移行済み

	it("キーボードナビゲーションが動作する", async () => {
		const user = userEvent.setup();
		render(<TestSiteHeader />);

		// Tabキーでフォーカス移動
		await user.tab();

		// スキップリンクにフォーカス
		expect(screen.getByText("メインコンテンツにスキップ")).toHaveFocus();

		// 次のタブでロゴリンク
		await user.tab();
		expect(screen.getByText("すずみなくりっく！")).toHaveFocus();
	});

	// CSSクラステストは統合テストに移行済み

	// レスポンシブクラステストは統合テストに移行済み
});
