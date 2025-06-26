import "@testing-library/jest-dom";
import React from "react";
import { vi } from "vitest";

// Mocks for Next.js
global.ResizeObserver = class ResizeObserver {
	observe() {}
	unobserve() {}
	disconnect() {}
};

// Mock for Web Audio API
global.AudioContext = class AudioContext {};
global.webkitAudioContext = class webkitAudioContext {};

// Mock for IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
	observe() {}
	unobserve() {}
	disconnect() {}
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

// Mock for getComputedStyle (needed for Radix UI components)
Object.defineProperty(window, "getComputedStyle", {
	writable: true,
	value: (_element: Element) => ({
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

// Mock for HTMLElement methods (needed for positioning)
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

// Mock for next/router
vi.mock("next/navigation", () => ({
	useRouter: () => ({
		push: vi.fn(),
		back: vi.fn(),
		forward: vi.fn(),
		refresh: vi.fn(),
		replace: vi.fn(),
		prefetch: vi.fn(),
	}),
	useSearchParams: () => ({
		get: vi.fn(),
		has: vi.fn(),
	}),
	usePathname: () => "/",
}));

// Mock for next/image
vi.mock("next/image", () => ({
	default: ({ src, alt, ...props }: { src: string; alt: string; [key: string]: unknown }) => {
		return React.createElement("img", { src, alt, ...props });
	},
}));
