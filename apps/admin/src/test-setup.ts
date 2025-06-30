import "@testing-library/jest-dom";
import { afterAll, beforeAll, vi } from "vitest";

// Next.js router mock
vi.mock("next/navigation", () => ({
	useRouter: () => ({
		push: vi.fn(),
		replace: vi.fn(),
		prefetch: vi.fn(),
		back: vi.fn(),
		refresh: vi.fn(),
	}),
	useSearchParams: () => ({
		get: vi.fn(),
		toString: vi.fn(),
	}),
	usePathname: () => "/",
}));

// NextAuth mock
vi.mock("next-auth/react", () => ({
	useSession: vi.fn(() => ({
		data: {
			user: {
				id: "test-user-id",
				name: "Test Admin",
				image: "https://example.com/avatar.png",
				discordId: "123456789012345678",
			},
			expires: "2024-12-31T23:59:59.999Z",
		},
		status: "authenticated",
	})),
	signIn: vi.fn(),
	signOut: vi.fn(),
}));

// Mock next-auth
vi.mock("next-auth", () => ({
	default: vi.fn(),
}));

// Firestore mock setup
vi.mock("@/lib/firestore", () => ({
	getFirestore: vi.fn(() => ({
		collection: vi.fn(),
		doc: vi.fn(),
		getDoc: vi.fn(),
		getDocs: vi.fn(),
		setDoc: vi.fn(),
		updateDoc: vi.fn(),
		deleteDoc: vi.fn(),
		query: vi.fn(),
		where: vi.fn(),
		orderBy: vi.fn(),
		limit: vi.fn(),
		startAfter: vi.fn(),
		onSnapshot: vi.fn(),
	})),
	collection: vi.fn(),
	doc: vi.fn(),
	getDoc: vi.fn(),
	getDocs: vi.fn(),
	setDoc: vi.fn(),
	updateDoc: vi.fn(),
	deleteDoc: vi.fn(),
	query: vi.fn(),
	where: vi.fn(),
	orderBy: vi.fn(),
	limit: vi.fn(),
	startAfter: vi.fn(),
	onSnapshot: vi.fn(),
	Timestamp: {
		now: vi.fn(() => ({
			toDate: () => new Date(),
			seconds: Math.floor(Date.now() / 1000),
			nanoseconds: 0,
		})),
		fromDate: vi.fn((date) => ({
			toDate: () => date,
			seconds: Math.floor(date.getTime() / 1000),
			nanoseconds: 0,
		})),
	},
	FieldValue: {
		serverTimestamp: vi.fn(),
		increment: vi.fn(),
	},
}));

// Suppress console warnings in tests
// biome-ignore lint/suspicious/noConsole: needed for test setup
const originalError = console.error;
// biome-ignore lint/suspicious/noConsole: needed for test setup
const originalWarn = console.warn;

beforeAll(() => {
	console.error = (...args: Parameters<typeof console.error>) => {
		// Suppress specific React warnings
		if (args[0]?.toString?.().includes("Warning:") || args[0]?.toString?.().includes("act()")) {
			return;
		}
		originalError.call(console, ...args);
	};
	console.warn = (..._args: Parameters<typeof console.warn>) => {
		// Suppress all warnings in tests
		return;
	};
});

afterAll(() => {
	console.error = originalError;
	console.warn = originalWarn;
});

// Global test utilities
global.ResizeObserver = vi.fn().mockImplementation(() => ({
	observe: vi.fn(),
	unobserve: vi.fn(),
	disconnect: vi.fn(),
}));

// Mock window.matchMedia
Object.defineProperty(window, "matchMedia", {
	writable: true,
	value: vi.fn().mockImplementation((query) => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: vi.fn(), // Deprecated
		removeListener: vi.fn(), // Deprecated
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn(),
	})),
});
