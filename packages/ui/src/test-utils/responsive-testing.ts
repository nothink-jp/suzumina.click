/**
 * レスポンシブデザインとタッチ操作のテストユーティリティ
 */
import { expect, test, vi } from "vitest";

/**
 * WCAG 2.1 AAレベルの最小タッチターゲットサイズ (44x44px) を検証
 */
export const validateTouchTargetSize = (element: HTMLElement, minSize = 44) => {
	const computedStyle = window.getComputedStyle(element);
	const height = Number.parseInt(computedStyle.height, 10);
	const width = Number.parseInt(computedStyle.width, 10);
	const minHeight = Number.parseInt(computedStyle.minHeight, 10) || height;
	const minWidth = Number.parseInt(computedStyle.minWidth, 10) || width;

	// 実際のサイズまたは最小サイズがminSize以上であることを確認
	const effectiveHeight = Math.max(height, minHeight);
	const effectiveWidth = Math.max(width, minWidth);

	expect(effectiveHeight).toBeGreaterThanOrEqual(minSize);
	expect(effectiveWidth).toBeGreaterThanOrEqual(minSize);
};

/**
 * レスポンシブCSSクラスの存在を検証
 */
export const validateResponsiveClasses = (
	element: HTMLElement,
	expectedClasses: {
		base?: string[];
		mobile?: string[];
		tablet?: string[];
		desktop?: string[];
	},
) => {
	const classList = Array.from(element.classList);

	// ベースクラス
	expectedClasses.base?.forEach((cls) => {
		expect(classList).toContain(cls);
	});

	// モバイル用クラス
	expectedClasses.mobile?.forEach((cls) => {
		expect(classList).toContain(cls);
	});

	// タブレット用クラス (sm:)
	expectedClasses.tablet?.forEach((cls) => {
		expect(classList).toContain(cls);
	});

	// デスクトップ用クラス (md:, lg:, xl:)
	expectedClasses.desktop?.forEach((cls) => {
		expect(classList).toContain(cls);
	});
};

/**
 * matchMediaのモックを設定
 */
export const mockViewport = (width: number, height: number) => {
	// matchMediaのモック
	Object.defineProperty(window, "matchMedia", {
		writable: true,
		value: vi.fn().mockImplementation((query: string) => {
			// クエリに基づいてマッチ結果を決定
			const breakpoints = {
				"(min-width: 640px)": width >= 640, // sm
				"(min-width: 768px)": width >= 768, // md
				"(min-width: 1024px)": width >= 1024, // lg
				"(min-width: 1280px)": width >= 1280, // xl
				"(max-width: 639px)": width < 640,
				"(max-width: 767px)": width < 768,
				"(max-width: 1023px)": width < 1024,
			};

			const matches = breakpoints[query as keyof typeof breakpoints] ?? false;

			return {
				matches,
				media: query,
				onchange: null,
				addListener: vi.fn(),
				removeListener: vi.fn(),
				addEventListener: vi.fn(),
				removeEventListener: vi.fn(),
				dispatchEvent: vi.fn(),
			};
		}),
	});

	// windowサイズのモック
	Object.defineProperty(window, "innerWidth", {
		writable: true,
		configurable: true,
		value: width,
	});

	Object.defineProperty(window, "innerHeight", {
		writable: true,
		configurable: true,
		value: height,
	});
};

/**
 * レスポンシブブレークポイントの定義
 */
export const BREAKPOINTS = {
	mobile: { width: 375, height: 667 },
	tablet: { width: 768, height: 1024 },
	desktop: { width: 1440, height: 900 },
	"tablet-sm": { width: 640, height: 960 },
	"desktop-lg": { width: 1920, height: 1080 },
} as const;

/**
 * 複数のビューポートでテストを実行するヘルパー
 */
export const testAcrossViewports = (
	testName: string,
	testFn: (viewport: { name: string; width: number; height: number }) => void,
) => {
	const viewports = [
		{ name: "Mobile", ...BREAKPOINTS.mobile },
		{ name: "Tablet", ...BREAKPOINTS.tablet },
		{ name: "Desktop", ...BREAKPOINTS.desktop },
	];

	viewports.forEach((viewport) => {
		test(`${testName} - ${viewport.name}`, () => {
			mockViewport(viewport.width, viewport.height);
			testFn(viewport);
		});
	});
};

/**
 * CSSクラスの数値を抽出（例: h-11 -> 44, min-w-[44px] -> 44）
 */
export const extractCSSValue = (className: string): number | null => {
	// Tailwind standard classes (h-11, w-8, etc.)
	const standardMatch = className.match(/^[hw]-(\d+)$/);
	if (standardMatch?.[1]) {
		return Number.parseInt(standardMatch[1], 10) * 4; // Tailwind spacing unit (0.25rem = 4px)
	}

	// Arbitrary values (min-h-[44px], etc.)
	const arbitraryMatch = className.match(/\[(\d+)px\]/);
	if (arbitraryMatch?.[1]) {
		return Number.parseInt(arbitraryMatch[1], 10);
	}

	return null;
};

/**
 * タッチターゲットのアクセシビリティ検証
 */
export const validateAccessibleTouchTarget = (element: HTMLElement) => {
	const boundingBox = element.getBoundingClientRect();

	// WCAG 2.1 AAA レベル: 44x44px 最小サイズ
	expect(boundingBox.width).toBeGreaterThanOrEqual(44);
	expect(boundingBox.height).toBeGreaterThanOrEqual(44);

	// 適切なfocus状態の確認
	element.focus();
	const focusedElement = document.activeElement;
	expect(focusedElement).toBe(element);
};
