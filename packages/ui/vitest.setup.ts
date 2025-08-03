import "@testing-library/jest-dom";
import { vi } from "vitest";

// グローバルな型定義
declare global {
	var mockRouter: any;
	var mockSearchParams: URLSearchParams;
}

// グローバル変数の初期化
global.mockRouter = {
	push: vi.fn(),
	replace: vi.fn(),
	refresh: vi.fn(),
	back: vi.fn(),
	forward: vi.fn(),
	prefetch: vi.fn(),
};

global.mockSearchParams = new URLSearchParams();

// Mock Next.js navigation
vi.mock("next/navigation", () => ({
	useRouter: () => global.mockRouter,
	useSearchParams: () => global.mockSearchParams,
	usePathname: () => "/",
}));

// Mock for ResizeObserver
global.ResizeObserver = class ResizeObserver {
	observe() {}
	unobserve() {}
	disconnect() {}
};

// Mock for IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
	root = null;
	rootMargin = "";
	thresholds = [];

	observe() {}
	unobserve() {}
	disconnect() {}
	takeRecords() {
		return [];
	}
};

// Mock for matchMedia
Object.defineProperty(window, "matchMedia", {
	writable: true,
	value: (query: string) => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: () => {},
		removeListener: () => {},
		addEventListener: () => {},
		removeEventListener: () => {},
		dispatchEvent: () => {},
	}),
});

// Mock for getComputedStyle
Object.defineProperty(window, "getComputedStyle", {
	writable: true,
	value: (element: Element) => ({
		getPropertyValue: () => "",
		position: "static",
		top: "auto",
		left: "auto",
		right: "auto",
		bottom: "auto",
		width: "auto",
		height: "auto",
		transform: "none",
		transformOrigin: "50% 50% 0px",
		display: "block",
		zIndex: "auto",
	}),
});

// Mock for HTMLElement methods
Object.defineProperty(HTMLElement.prototype, "offsetParent", {
	get() {
		return this.parentNode;
	},
});

Object.defineProperty(HTMLElement.prototype, "offsetTop", {
	get() {
		return 0;
	},
});

Object.defineProperty(HTMLElement.prototype, "offsetLeft", {
	get() {
		return 0;
	},
});

Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
	get() {
		return 0;
	},
});

Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
	get() {
		return 0;
	},
});
