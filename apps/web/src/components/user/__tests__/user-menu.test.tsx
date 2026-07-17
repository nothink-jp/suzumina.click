import type { UserSession } from "@suzumina.click/shared-types";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import UserMenu from "../user-menu";

// UserAvatarコンポーネントのモック
vi.mock("../user-avatar", () => ({
	default: ({ displayName, discordId, avatar, size, className }: any) => (
		// biome-ignore lint/performance/noImgElement: モックコンポーネントでは<img>の使用を許可
		<img
			alt={`${displayName}のアバター`}
			src={`https://cdn.discordapp.com/avatars/${discordId}/${avatar}.png?size=${size}`}
			width={size}
			height={size}
			className={className}
			data-testid="user-avatar"
		/>
	),
}));

// client 認証抽象のモック（signOut）
const mockSignOut = vi.fn(async () => {});
vi.mock("@/lib/auth/client", () => ({
	signOut: () => mockSignOut(),
}));

// next/navigation のモック（router.push / refresh / usePathname）
const mockPush = vi.fn();
const mockRefresh = vi.fn();
let mockPathname = "/buttons";
vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: mockPush, refresh: mockRefresh }),
	usePathname: () => mockPathname,
}));

// logger のモック（エラーパス検証用）
vi.mock("@/lib/logger", () => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() }));

// Next.js Linkコンポーネントのモック
vi.mock("next/link", () => ({
	default: ({ children, href }: { children: React.ReactNode; href: string }) => (
		<a href={href}>{children}</a>
	),
}));

describe("UserMenu", () => {
	const mockUser: UserSession = {
		discordId: "123456789",
		username: "testuser",
		displayName: "テストユーザー",
		avatar: "avatar-hash",
		guildMembership: {
			guildId: "test-guild",
			userId: "123456789",
			isMember: true,
		},
		isActive: true,
	};

	beforeEach(() => {
		vi.clearAllMocks();
		mockPathname = "/buttons";
	});

	it("ユーザー情報を正しく表示する", () => {
		render(<UserMenu user={mockUser} />);

		// トリガーボタンにユーザー名が表示されている（複数の要素に同じテキストがあるためAllByを使用）
		const userNameElements = screen.getAllByText("テストユーザー");
		expect(userNameElements.length).toBeGreaterThan(0);
		// Check for user avatar image instead of data-testid
		expect(screen.getByAltText("テストユーザーのアバター")).toBeInTheDocument();
	});

	it("ドロップダウンメニューを開くことができる", async () => {
		const user = userEvent.setup();
		render(<UserMenu user={mockUser} />);

		// トリガーボタンをクリック
		const triggerButton = screen.getByRole("button", { name: "ユーザーメニューを開く" });
		await user.click(triggerButton);

		// メニュー項目が表示される（テキストで検索）
		expect(screen.getByText("マイページ")).toBeInTheDocument();
		expect(screen.getByText("ログアウト")).toBeInTheDocument();
	});

	it("マイページリンクが正しく設定されている", async () => {
		const user = userEvent.setup();
		render(<UserMenu user={mockUser} />);

		// メニューを開く
		const triggerButton = screen.getByRole("button", { name: "ユーザーメニューを開く" });
		await user.click(triggerButton);

		// マイページリンクを確認
		const myPageLink = screen.getByRole("link", { name: /マイページ/i });
		expect(myPageLink).toHaveAttribute("href", "/users/me");
	});

	it("配信中マーキングリンクが常設されている（配信終了後の下書き仕上げ導線）", async () => {
		const user = userEvent.setup();
		render(<UserMenu user={mockUser} />);

		const triggerButton = screen.getByRole("button", { name: "ユーザーメニューを開く" });
		await user.click(triggerButton);

		const liveLink = screen.getByRole("link", { name: /配信中マーキング/i });
		expect(liveLink).toHaveAttribute("href", "/live");
	});

	async function clickLogout() {
		const user = userEvent.setup();
		render(<UserMenu user={mockUser} />);
		await user.click(screen.getByRole("button", { name: "ユーザーメニューを開く" }));
		await user.click(screen.getByText("ログアウト"));
	}

	it("公開ページでのログアウトはその場に留まる（push せず refresh のみ）", async () => {
		mockPathname = "/buttons/RJ123";
		await clickLogout();

		expect(mockSignOut).toHaveBeenCalledOnce();
		await waitFor(() => expect(mockRefresh).toHaveBeenCalledOnce());
		expect(mockPush).not.toHaveBeenCalled();
	});

	it("認証必須ページでのログアウトはトップへ遷移する", async () => {
		mockPathname = "/settings";
		await clickLogout();

		expect(mockSignOut).toHaveBeenCalledOnce();
		await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/"));
		expect(mockRefresh).toHaveBeenCalledOnce();
	});

	it("signOut 失敗時も遷移処理は続行する（実セッション状態へ再同期）", async () => {
		mockPathname = "/favorites";
		mockSignOut.mockRejectedValueOnce(new Error("network error"));
		await clickLogout();

		await waitFor(() => expect(mockPush).toHaveBeenCalledWith("/"));
		expect(mockRefresh).toHaveBeenCalledOnce();
	});

	it("アクセシビリティ属性が正しく設定されている", () => {
		render(<UserMenu user={mockUser} />);

		const triggerButton = screen.getByRole("button", { name: "ユーザーメニューを開く" });
		expect(triggerButton).toHaveAttribute("aria-label", "ユーザーメニューを開く");
	});
});
