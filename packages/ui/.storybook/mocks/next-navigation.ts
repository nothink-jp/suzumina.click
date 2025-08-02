/**
 * Mock for Next.js navigation hooks in Storybook
 */

// Simple mock functions that log to console
const mockFn =
	(name: string) =>
	(...args: any[]) => {
		console.log(`[Next Navigation Mock] ${name}`, args);
	};

// Mock useRouter
export const useRouter = () => ({
	push: mockFn("router.push"),
	replace: mockFn("router.replace"),
	back: mockFn("router.back"),
	forward: mockFn("router.forward"),
	refresh: mockFn("router.refresh"),
	prefetch: mockFn("router.prefetch"),
});

// Mock useSearchParams
export const useSearchParams = () => {
	const params = new URLSearchParams(window.location.search);
	return params;
};

// Mock usePathname
export const usePathname = () => {
	return window.location.pathname || "/";
};

// Mock useParams
export const useParams = () => {
	return {};
};

// Mock notFound
export const notFound = () => {
	console.log("[Next Navigation Mock] notFound");
	throw new Error("NEXT_NOT_FOUND");
};

// Mock redirect
export const redirect = (url: string) => {
	console.log("[Next Navigation Mock] redirect", url);
};

// Mock permanentRedirect
export const permanentRedirect = (url: string) => {
	console.log("[Next Navigation Mock] permanentRedirect", url);
};
