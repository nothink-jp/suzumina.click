/**
 * 基本的なコンポーネントレンダリング統合テスト
 * 個別ファイルの重複する基本テストを統合
 */

import type { FrontendAudioButtonData } from "@suzumina.click/shared-types";
import { SimpleAudioButton } from "@suzumina.click/ui/components/custom/simple-audio-button";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import Pagination from "@/components/Pagination";
import SearchForm from "@/components/SearchForm";
// コンポーネントインポート
import SiteFooter from "@/components/SiteFooter";
import ThumbnailImage from "@/components/ThumbnailImage";

// 共通モック設定
vi.mock("next/link", () => ({
	default: ({ children, href }: { children: React.ReactNode; href: string }) => (
		<a href={href}>{children}</a>
	),
}));

vi.mock("next/image", () => ({
	default: ({ src, alt, ...props }: { src: string; alt: string; [key: string]: unknown }) => (
		// biome-ignore lint/performance/noImgElement: Mock implementation for testing
		<img src={src} alt={alt} data-testid="next-image" {...props} />
	),
}));

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
	useSearchParams: () => ({ get: vi.fn(() => "1"), toString: vi.fn(() => "") }),
	usePathname: () => "/test",
}));

// YouTube API のモック（SimpleAudioButton用）
interface MockYT {
	Player: (id: string, config: unknown) => unknown;
	PlayerState: {
		UNSTARTED: number;
		ENDED: number;
		PLAYING: number;
		PAUSED: number;
		BUFFERING: number;
		CUED: number;
	};
	ready: () => void;
}

(
	global as typeof global & {
		window: Window & {
			YT: MockYT;
			onYouTubeIframeAPIReady: () => void;
		};
	}
).window = {
	...global.window,
	YT: {
		Player: vi.fn().mockImplementation(() => ({
			playVideo: vi.fn(),
			pauseVideo: vi.fn(),
			destroy: vi.fn(),
		})),
		PlayerState: {
			UNSTARTED: -1,
			ENDED: 0,
			PLAYING: 1,
			PAUSED: 2,
			BUFFERING: 3,
			CUED: 5,
		},
		ready: vi.fn(),
	},
	onYouTubeIframeAPIReady: vi.fn(),
};

// SimpleAudioButton用のモックデータ
const mockAudioButtonData: FrontendAudioButtonData = {
	id: "test-audio-button-1",
	title: "テスト音声ボタン",
	description: "統合テスト用の音声ボタン",
	tags: ["テスト", "統合"],
	sourceVideoId: "dQw4w9WgXcQ",
	sourceVideoTitle: "テスト動画",
	sourceVideoThumbnailUrl: "https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
	startTime: 10,
	endTime: 15,
	createdBy: "test-user-123",
	createdByName: "テストユーザー",
	isPublic: true,
	playCount: 100,
	likeCount: 25,
	favoriteCount: 10,
	createdAt: "2024-06-26T00:00:00.000Z",
	updatedAt: "2024-06-26T00:00:00.000Z",
	durationText: "5秒",
	relativeTimeText: "1日前",
};

describe("Basic Component Rendering Integration Tests", () => {
	// 基本的なレンダリングテスト（パラメータ化）
	it.each([
		[
			"SiteFooter",
			SiteFooter,
			{},
			[
				{ type: "role", selector: "contentinfo" },
				{ type: "text", selector: "suzumina.click" },
				{ type: "text", selector: "このサイトについて" },
			],
		],
		[
			"ThumbnailImage",
			ThumbnailImage,
			{ src: "https://example.com/test.jpg", alt: "テスト画像" },
			[{ type: "testId", selector: "next-image" }],
		],
		[
			"SearchForm",
			SearchForm,
			{},
			[
				{ type: "placeholder", selector: "ボタンや作品を検索..." },
				{ type: "role", selector: "button", name: "検索" },
			],
		],
		[
			"Pagination",
			Pagination,
			{ currentPage: 1, totalPages: 5 },
			[
				{ type: "text", selector: "Previous" },
				{ type: "text", selector: "Next" },
				{ type: "text", selector: "1" },
				{ type: "role", selector: "navigation" },
			],
		],
		[
			"SimpleAudioButton",
			SimpleAudioButton,
			{ audioButton: mockAudioButtonData },
			[
				{ type: "text", selector: "テスト音声ボタン" },
				{ type: "label", selector: "テスト音声ボタンを再生" },
				{ type: "label", selector: "詳細情報を表示" },
			],
		],
	])("renders %s component correctly", (_name, Component, props, assertions) => {
		render(<Component {...props} />);

		assertions.forEach(({ type, selector, name: roleName }) => {
			switch (type) {
				case "role":
					if (roleName) {
						expect(screen.getByRole(selector, { name: roleName })).toBeInTheDocument();
					} else {
						expect(screen.getByRole(selector)).toBeInTheDocument();
					}
					break;
				case "text":
					expect(screen.getByText(selector)).toBeInTheDocument();
					break;
				case "testId":
					expect(screen.getByTestId(selector)).toBeInTheDocument();
					break;
				case "placeholder":
					expect(screen.getByPlaceholderText(selector)).toBeInTheDocument();
					break;
				case "label":
					expect(screen.getByLabelText(selector)).toBeInTheDocument();
					break;
			}
		});
	});

	// アクセシビリティ要素の統合テスト
	it.each([
		[
			"SiteFooter",
			SiteFooter,
			{},
			{
				role: "contentinfo",
				links: [
					{ text: "このサイトについて", href: "/about" },
					{ text: "お問い合わせ", href: "/contact" },
					{ text: "利用規約", href: "/terms" },
					{ text: "プライバシーポリシー", href: "/privacy" },
				],
			},
		],
		[
			"SearchForm",
			SearchForm,
			{},
			{
				role: "textbox",
				inputAttributes: [{ attribute: "placeholder", value: "ボタンや作品を検索..." }],
			},
		],
		[
			"Pagination",
			Pagination,
			{ currentPage: 2, totalPages: 5 },
			{
				role: "navigation",
				buttons: [{ text: "Previous" }, { text: "Next" }],
			},
		],
	])("has correct accessibility for %s", (_name, Component, props, accessibility) => {
		render(<Component {...props} />);

		// メインロール要素の確認
		expect(screen.getByRole(accessibility.role)).toBeInTheDocument();

		// リンクのアクセシビリティ確認
		if (accessibility.links) {
			accessibility.links.forEach(({ text, href }) => {
				const link = screen.getByText(text).closest("a");
				expect(link).toHaveAttribute("href", href);
			});
		}

		// 入力要素の属性確認
		if (accessibility.inputAttributes) {
			const input = screen.getByRole(accessibility.role);
			accessibility.inputAttributes.forEach(({ attribute, value }) => {
				expect(input).toHaveAttribute(attribute, value);
			});
		}

		// ボタンの存在確認
		if (accessibility.buttons) {
			accessibility.buttons.forEach(({ text }) => {
				expect(screen.getByText(text)).toBeInTheDocument();
			});
		}
	});

	// CSS クラスの統合テスト（基本的なスタイリング確認）
	describe("CSS Classes Integration", () => {
		it.each([
			[
				"SiteFooter",
				SiteFooter,
				{},
				{
					element: () => screen.getByRole("contentinfo"),
					classes: ["bg-minase-800", "text-minase-50", "py-12", "mt-auto"],
				},
			],
			[
				"SearchForm",
				SearchForm,
				{},
				{
					element: () => screen.getByRole("textbox").closest("form"),
					classes: ["flex", "max-w-md", "mx-auto"],
				},
			],
		])("applies correct styling classes for %s", (_name, Component, props, styling) => {
			render(<Component {...props} />);

			const element = styling.element();
			styling.classes.forEach((className) => {
				expect(element).toHaveClass(className);
			});
		});
	});

	// プロパティ処理の統合テスト
	describe("Props Handling Integration", () => {
		it("ThumbnailImage handles various prop combinations", () => {
			const propCombinations = [
				{ src: "https://example.com/1.jpg", alt: "Test 1" },
				{ src: "https://example.com/2.jpg", alt: "Test 2", width: 800, height: 600 },
				{ src: "https://example.com/3.jpg", alt: "Test 3", priority: true },
			];

			propCombinations.forEach((props) => {
				const { unmount } = render(<ThumbnailImage {...props} />);

				const image = screen.getByTestId("next-image");
				expect(image).toHaveAttribute("src", props.src);
				expect(image).toHaveAttribute("alt", props.alt);

				unmount();
			});
		});

		it("Pagination handles different page configurations", () => {
			const pageConfigurations = [
				{ currentPage: 1, totalPages: 1 },
				{ currentPage: 1, totalPages: 5 },
				{ currentPage: 3, totalPages: 5 },
				{ currentPage: 5, totalPages: 5 },
			];

			pageConfigurations.forEach(({ currentPage, totalPages }) => {
				const { unmount } = render(
					<Pagination currentPage={currentPage} totalPages={totalPages} />,
				);

				expect(screen.getByRole("navigation")).toBeInTheDocument();
				expect(screen.getByText(currentPage.toString())).toBeInTheDocument();

				unmount();
			});
		});
	});
});
