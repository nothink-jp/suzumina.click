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

// NextAuth mocks are now handled by vitest.config.ts aliases

// Mock for next/image - Enhanced for better test stability
vi.mock("next/image", () => ({
	default: ({
		src,
		alt,
		onError,
		fill,
		priority,
		sizes,
		placeholder,
		blurDataURL,
		style,
		...props
	}: {
		src: string;
		alt: string;
		onError?: (e: React.SyntheticEvent<HTMLImageElement, Event>) => void;
		fill?: boolean;
		priority?: boolean;
		sizes?: string;
		placeholder?: string;
		blurDataURL?: string;
		style?: React.CSSProperties;
		[key: string]: unknown;
	}) => {
		// Convert Next.js specific props to data attributes to avoid React warnings
		const dataAttributes: Record<string, string> = {};
		if (fill !== undefined) dataAttributes["data-fill"] = String(fill);
		if (priority !== undefined) dataAttributes["data-priority"] = String(priority);
		if (placeholder !== undefined) dataAttributes["data-placeholder"] = placeholder;
		if (blurDataURL !== undefined) dataAttributes["data-blur-data-url"] = blurDataURL;

		return React.createElement("img", {
			src,
			alt,
			sizes,
			style,
			onError,
			"data-testid": "next-image",
			...dataAttributes,
			...props,
		});
	},
}));

// Mock for lucide-react icons
vi.mock("lucide-react", () => {
	const createMockIcon = (name: string) => {
		return React.forwardRef<SVGSVGElement, React.SVGProps<SVGSVGElement>>((props, ref) =>
			React.createElement("svg", {
				...props,
				ref,
				"data-testid": `${name}-icon`,
				"data-lucide": name.toLowerCase(),
			}),
		);
	};

	return {
		// Existing icons
		BookOpen: createMockIcon("BookOpen"),
		ChevronRight: createMockIcon("ChevronRight"),
		Filter: createMockIcon("Filter"),
		Loader2: createMockIcon("Loader2"),
		Music: createMockIcon("Music"),
		Search: createMockIcon("Search"),
		Video: createMockIcon("Video"),
		X: createMockIcon("X"),
		Play: createMockIcon("Play"),
		Pause: createMockIcon("Pause"),
		Heart: createMockIcon("Heart"),
		Star: createMockIcon("Star"),
		ExternalLink: createMockIcon("ExternalLink"),
		Download: createMockIcon("Download"),
		Share2: createMockIcon("Share2"),
		MoreHorizontal: createMockIcon("MoreHorizontal"),
		Edit: createMockIcon("Edit"),
		Trash2: createMockIcon("Trash2"),
		Check: createMockIcon("Check"),
		Copy: createMockIcon("Copy"),
		AlertCircle: createMockIcon("AlertCircle"),
		Info: createMockIcon("Info"),
		User: createMockIcon("User"),
		Users: createMockIcon("Users"),
		Calendar: createMockIcon("Calendar"),
		Clock: createMockIcon("Clock"),
		Settings: createMockIcon("Settings"),
		Menu: createMockIcon("Menu"),
		Home: createMockIcon("Home"),
		Headphones: createMockIcon("Headphones"),
		// New icons for SearchFilters
		SlidersHorizontal: createMockIcon("SlidersHorizontal"),
		RotateCcw: createMockIcon("RotateCcw"),
		// Icons for AudioButtonCreator
		Plus: createMockIcon("Plus"),
		// Icons for VideoCard
		Eye: createMockIcon("Eye"),
		Radio: createMockIcon("Radio"),
		// Icons for UserMenu
		LogOut: createMockIcon("LogOut"),
		// Icons for AutocompleteDropdown and SearchInputWithAutocomplete
		Tag: createMockIcon("Tag"),
		FileText: createMockIcon("FileText"),
		// Icons for VideoDetail
		Timer: createMockIcon("Timer"),
		Youtube: createMockIcon("Youtube"),
		ArrowLeft: createMockIcon("ArrowLeft"),
		PlayCircle: createMockIcon("PlayCircle"),
		// Icons for Pagination
		ChevronLeftIcon: createMockIcon("ChevronLeftIcon"),
		ChevronRightIcon: createMockIcon("ChevronRightIcon"),
		MoreHorizontalIcon: createMockIcon("MoreHorizontalIcon"),
		// Icons for RadioGroup
		CircleIcon: createMockIcon("CircleIcon"),
		// Icons for Select
		ChevronDownIcon: createMockIcon("ChevronDownIcon"),
		ChevronUpIcon: createMockIcon("ChevronUpIcon"),
		CheckIcon: createMockIcon("CheckIcon"),
	};
});
