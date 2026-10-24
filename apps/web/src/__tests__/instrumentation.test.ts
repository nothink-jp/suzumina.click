import { describe, expect, it, vi } from "vitest";
import { onRequestError } from "../instrumentation";

vi.mock("@/lib/logger", () => ({ error: vi.fn() }));

const { error: logError } = await import("@/lib/logger");

const request = { path: "/works/RJ01?x=1", method: "GET", headers: { cookie: "secret" } };
const context = {
	routerKind: "App Router",
	routePath: "/works/[workId]",
	routeType: "render",
	renderSource: "react-server-components",
	revalidateReason: undefined,
} as const;

describe("onRequestError", () => {
	it("route 情報と digest 付きで logger.error に流す", () => {
		const err = Object.assign(new Error("boom"), { digest: "123" });
		onRequestError(err, request, context);
		expect(logError).toHaveBeenCalledWith("未捕捉のサーバーエラー", {
			error: err,
			digest: "123",
			path: "/works/RJ01?x=1",
			method: "GET",
			routePath: "/works/[workId]",
			routeType: "render",
			renderSource: "react-server-components",
		});
	});

	it("headers（Cookie）は出さず、digest が無ければ undefined", () => {
		vi.mocked(logError).mockClear();
		onRequestError("thrown string", request, context);
		const [, meta] = vi.mocked(logError).mock.calls[0] as [string, Record<string, unknown>];
		expect(meta.digest).toBeUndefined();
		expect(meta).not.toHaveProperty("headers");
		expect(JSON.stringify(meta)).not.toContain("secret");
	});
});
