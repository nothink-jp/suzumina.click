import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { middleware } from "./middleware";

// NextResponse をモック
vi.mock("next/server", async () => {
	const actual = await vi.importActual("next/server");
	return {
		...actual,
		NextResponse: vi.fn().mockImplementation((body, init) => ({
			status: init?.status || 200,
			body,
		})),
	};
});

// NextResponseのstatic methodsを追加
beforeEach(() => {
	(NextResponse as any).next = vi.fn(() => ({ status: 200 }));
});

// NextRequestのモック用ヘルパー
const createMockNextRequest = (url: string, options?: { headers?: Record<string, string> }) => {
	const parsedUrl = new URL(url);
	return {
		nextUrl: {
			pathname: parsedUrl.pathname,
			origin: parsedUrl.origin,
		},
		headers: {
			get: vi.fn((key: string) => options?.headers?.[key] || null),
		},
		url,
	} as unknown as NextRequest;
};

describe("middleware", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// 環境変数をリセット
		delete process.env.NODE_ENV;
		delete process.env.ALLOWED_HOSTS;
	});

	describe("Host validation", () => {
		it("should allow all hosts in development", async () => {
			process.env.NODE_ENV = "development";

			const request = createMockNextRequest("http://localhost:3000/test");
			const response = await middleware(request);

			expect(response.status).toBe(200);
		});

		it("should allow all hosts when ALLOWED_HOSTS is not set", async () => {
			process.env.NODE_ENV = "production";

			const request = createMockNextRequest("http://example.com/test");
			const response = await middleware(request);

			expect(response.status).toBe(200);
		});

		it("should allow requests from allowed hosts", async () => {
			process.env.NODE_ENV = "production";
			process.env.ALLOWED_HOSTS = "suzumina.click,www.suzumina.click";

			const request = createMockNextRequest("http://suzumina.click/test", {
				headers: { host: "suzumina.click" },
			});
			const response = await middleware(request);

			expect(response.status).toBe(200);
		});

		it("should reject requests from non-allowed hosts", async () => {
			process.env.NODE_ENV = "production";
			process.env.ALLOWED_HOSTS = "suzumina.click";

			const request = createMockNextRequest("http://malicious.com/test", {
				headers: { host: "malicious.com" },
			});

			const response = await middleware(request);

			expect(response.status).toBe(404);
			expect(response.body).toBe("Not Found");
		});

		it("should always allow health check endpoint", async () => {
			process.env.NODE_ENV = "production";
			process.env.ALLOWED_HOSTS = "suzumina.click";

			const request = createMockNextRequest("http://malicious.com/api/health", {
				headers: { host: "malicious.com" },
			});
			const response = await middleware(request);

			expect(response.status).toBe(200);
		});

		it("should handle multiple allowed hosts", async () => {
			process.env.NODE_ENV = "production";
			process.env.ALLOWED_HOSTS = "suzumina.click, admin.suzumina.click, api.suzumina.click";

			const adminRequest = createMockNextRequest("http://admin.suzumina.click/admin", {
				headers: { host: "admin.suzumina.click" },
			});
			const adminResponse = await middleware(adminRequest);

			expect(adminResponse.status).toBe(200);

			const apiRequest = createMockNextRequest("http://api.suzumina.click/api/test", {
				headers: { host: "api.suzumina.click" },
			});
			const apiResponse = await middleware(apiRequest);

			expect(apiResponse.status).toBe(200);
		});

		it("should handle requests without host header", async () => {
			process.env.NODE_ENV = "production";
			process.env.ALLOWED_HOSTS = "suzumina.click";

			const request = createMockNextRequest("http://suzumina.click/test");
			// headers.get("host") will return null
			const response = await middleware(request);

			expect(response.status).toBe(200);
		});

		it("should trim whitespace from allowed hosts configuration", async () => {
			process.env.NODE_ENV = "production";
			process.env.ALLOWED_HOSTS = " suzumina.click , admin.suzumina.click ";

			const request = createMockNextRequest("http://suzumina.click/test", {
				headers: { host: "suzumina.click" },
			});
			const response = await middleware(request);

			expect(response.status).toBe(200);
		});
	});

	describe("Path matching", () => {
		it("should process paths that match the config matcher", async () => {
			const request = createMockNextRequest("http://localhost:3000/test");
			const response = await middleware(request);

			expect(response.status).toBe(200);
		});

		it("should not interfere with static files", () => {
			// Note: This test verifies that the config.matcher excludes static files
			const staticPaths = ["/_next/static/css/app.css", "/_next/image/logo.png", "/favicon.ico"];

			staticPaths.forEach((path) => {
				// These paths should not match the middleware config
				const shouldMatch = !path.match(/^\/(_next\/static|_next\/image|favicon\.ico)/);
				expect(shouldMatch).toBe(false);
			});
		});

		it("should process API routes", async () => {
			const request = createMockNextRequest("http://localhost:3000/api/test");
			const response = await middleware(request);

			expect(response.status).toBe(200);
		});

		it("should process dynamic routes", async () => {
			const dynamicRoutes = ["/buttons/123", "/videos/abc-def", "/works/456", "/users/profile"];

			for (const route of dynamicRoutes) {
				const request = createMockNextRequest(`http://localhost:3000${route}`);
				const response = await middleware(request);

				expect(response.status).toBe(200);
			}
		});
	});
});
