import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import SearchForm from "./SearchForm";

// Mock next/navigation
const mockPush = vi.fn();
const mockReplace = vi.fn();

vi.mock("next/navigation", () => ({
	useRouter: () => ({
		push: mockPush,
		replace: mockReplace,
	}),
	useSearchParams: () => ({
		get: vi.fn(() => null),
		toString: vi.fn(() => ""),
	}),
	usePathname: () => "/",
}));

describe("SearchForm", () => {
	beforeEach(() => {
		mockPush.mockClear();
		mockReplace.mockClear();
	});

	// 基本的なレンダリングテストは統合テストに移行済み
	// (src/__tests__/integration/basicComponentRendering.test.tsx)

	it("検索入力フィールドが正しく動作する", async () => {
		const user = userEvent.setup();
		render(<SearchForm />);

		const searchInput = screen.getByPlaceholderText("ボタンや作品を検索...");

		// テキスト入力
		await user.type(searchInput, "テスト検索");
		expect(searchInput).toHaveValue("テスト検索");
	});

	it("フォーム送信で検索ページに遷移する", async () => {
		const user = userEvent.setup();
		render(<SearchForm />);

		const searchInput = screen.getByPlaceholderText("ボタンや作品を検索...");
		const searchButton = screen.getByRole("button", { name: "検索" });

		// 検索クエリを入力
		await user.type(searchInput, "涼花みなせ");

		// フォーム送信
		await user.click(searchButton);

		// 検索パスに遷移することを確認
		expect(mockPush).toHaveBeenCalledWith(`/search?q=${encodeURIComponent("涼花みなせ")}`);
	});

	it("Enterキーでフォーム送信される", async () => {
		const user = userEvent.setup();
		render(<SearchForm />);

		const searchInput = screen.getByPlaceholderText("ボタンや作品を検索...");

		// 検索クエリを入力してEnterキー
		await user.type(searchInput, "音声ボタン{enter}");

		// 検索パスに遷移することを確認
		expect(mockPush).toHaveBeenCalledWith(`/search?q=${encodeURIComponent("音声ボタン")}`);
	});

	it("空白のみの検索クエリでは送信されない", async () => {
		const user = userEvent.setup();
		render(<SearchForm />);

		const searchInput = screen.getByPlaceholderText("ボタンや作品を検索...");
		const searchButton = screen.getByRole("button", { name: "検索" });

		// 空白のみを入力
		await user.type(searchInput, "   ");
		await user.click(searchButton);

		// 検索パスに遷移しないことを確認
		expect(mockPush).not.toHaveBeenCalled();
	});

	it("空文字列の検索クエリでは送信されない", async () => {
		const user = userEvent.setup();
		render(<SearchForm />);

		const searchButton = screen.getByRole("button", { name: "検索" });

		// 空文字列で送信
		await user.click(searchButton);

		// 検索パスに遷移しないことを確認
		expect(mockPush).not.toHaveBeenCalled();
	});

	it("検索クエリの前後の空白が削除される", async () => {
		const user = userEvent.setup();
		render(<SearchForm />);

		const searchInput = screen.getByPlaceholderText("ボタンや作品を検索...");
		const searchButton = screen.getByRole("button", { name: "検索" });

		// 前後に空白がある検索クエリを入力
		await user.type(searchInput, "  テスト検索  ");
		await user.click(searchButton);

		// トリムされた状態で送信されることを確認
		expect(mockPush).toHaveBeenCalledWith(`/search?q=${encodeURIComponent("テスト検索")}`);
	});

	it("特殊文字が正しくエンコードされる", async () => {
		const user = userEvent.setup();
		render(<SearchForm />);

		const searchInput = screen.getByPlaceholderText("ボタンや作品を検索...");
		const searchButton = screen.getByRole("button", { name: "検索" });

		// 特殊文字を含む検索クエリ
		const specialQuery = "検索&テスト=値+スペース";
		await user.type(searchInput, specialQuery);
		await user.click(searchButton);

		// 正しくエンコードされることを確認
		expect(mockPush).toHaveBeenCalledWith(`/search?q=${encodeURIComponent(specialQuery)}`);
	});

	// アクセシビリティテストは統合テストに移行済み

	// レスポンシブレイアウトテストは統合テストに移行済み

	// タッチ最適化スタイルテストは統合テストに移行済み

	// 検索アイコン配置テストは統合テストに移行済み

	// メモ化テストは統合テストに移行済み

	it("キーボードナビゲーションとフォーカス管理", async () => {
		const user = userEvent.setup();
		render(<SearchForm />);

		const searchInput = screen.getByRole("textbox");
		const searchButton = screen.getByRole("button", { name: "検索" });

		// Tabキーでフォーカス移動
		await user.tab();
		expect(searchInput).toHaveFocus();

		await user.tab();
		expect(searchButton).toHaveFocus();

		// スペースキーでボタンを押下（検索クエリが空なので送信されない）
		await user.keyboard(" ");
		expect(mockPush).not.toHaveBeenCalled();
	});
});
