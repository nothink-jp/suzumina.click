import { render } from "@testing-library/react";
import { vi } from "vitest";
import { GoogleTagManager, GoogleTagManagerNoscript } from "./GoogleTagManager";

// Next.js Script をモック
vi.mock("next/script", () => ({
	Script: ({ children, dangerouslySetInnerHTML, ...props }: any) => {
		if (dangerouslySetInnerHTML) {
			return <script {...props} dangerouslySetInnerHTML={dangerouslySetInnerHTML} />;
		}
		return <script {...props}>{children}</script>;
	},
}));

describe("GoogleTagManager", () => {
	const originalEnv = process.env;

	beforeEach(() => {
		process.env = { ...originalEnv };
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	it("GTM IDが設定されている場合、GTMスクリプトをレンダリングする", () => {
		process.env.NEXT_PUBLIC_GTM_ID = "GTM-W7QT5PCR";

		const { container } = render(<GoogleTagManager />);

		const script = container.querySelector("script");
		expect(script).toBeInTheDocument();
		expect(script?.innerHTML).toContain("GTM-W7QT5PCR");
		expect(script?.innerHTML).toContain("googletagmanager.com/gtm.js");
	});

	it("GTM IDが設定されていない場合、何もレンダリングしない", () => {
		delete process.env.NEXT_PUBLIC_GTM_ID;

		const { container } = render(<GoogleTagManager />);

		const script = container.querySelector("script");
		expect(script).not.toBeInTheDocument();
	});

	it("GTM IDが設定されていない場合、エラーを発生させない", () => {
		delete process.env.NEXT_PUBLIC_GTM_ID;

		expect(() => {
			render(<GoogleTagManager />);
		}).not.toThrow();
	});
});

describe("GoogleTagManagerNoscript", () => {
	const originalEnv = process.env;

	beforeEach(() => {
		process.env = { ...originalEnv };
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	it("GTM IDが設定されている場合、noscriptでiframeをレンダリングする", () => {
		process.env.NEXT_PUBLIC_GTM_ID = "GTM-W7QT5PCR";

		const { container } = render(<GoogleTagManagerNoscript />);

		const noscript = container.querySelector("noscript");
		expect(noscript).toBeInTheDocument();
	});

	it("GTM IDが設定されていない場合、何もレンダリングしない", () => {
		delete process.env.NEXT_PUBLIC_GTM_ID;

		const { container } = render(<GoogleTagManagerNoscript />);

		const noscript = container.querySelector("noscript");
		expect(noscript).not.toBeInTheDocument();
	});

	it("GTM IDが設定されている場合、レンダリングが成功する", () => {
		process.env.NEXT_PUBLIC_GTM_ID = "GTM-W7QT5PCR";

		expect(() => {
			render(<GoogleTagManagerNoscript />);
		}).not.toThrow();
	});
});
