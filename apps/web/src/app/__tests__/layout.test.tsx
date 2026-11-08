import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/font/google", () => ({
	M_PLUS_Rounded_1c: () => ({ className: "font-mock" }),
}));
vi.mock("@suzumina.click/ui/globals.css", () => ({}));
vi.mock("@suzumina.click/ui/components/ui/sonner", () => ({ Toaster: () => null }));
vi.mock("@/components/layout/site-header", () => ({ default: () => <header /> }));
vi.mock("@/components/layout/site-footer", () => ({ default: () => <footer /> }));
vi.mock("@/components/system/deferred-global-effects", () => ({
	DeferredGlobalEffects: () => null,
}));
vi.mock("@/components/consent/age-verification-overlay-deferred", () => ({
	AgeVerificationOverlayDeferred: () => null,
}));
vi.mock("@/components/user/session-provider", () => ({
	SessionProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("@/contexts/age-verification-context", () => ({
	AgeVerificationProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
vi.mock("server-only", () => ({}));

const ANALYTICS_ENV = ["NEXT_PUBLIC_GA_MEASUREMENT_ID", "NEXT_PUBLIC_GTM_ID"] as const;

async function renderLayoutHtml(): Promise<string> {
	vi.resetModules();
	const { default: RootLayout } = await import("../layout");
	return renderToStaticMarkup(
		<RootLayout>
			<p>page</p>
		</RootLayout>,
	);
}

/**
 * 本番の静的シェルはビルド時（解析系 env 未定義）に prerender され、RSC は実行時（env あり）に描かれる。
 * ルートレイアウトの HTML が env で変わると、その差がそのままハイドレーション不一致（React #418）になる。
 * 実例: GTM の <noscript><iframe> がシェルに無く RSC にだけあり、トップページがルートごと client 再描画されていた。
 *
 * 守る範囲: env で素の要素を出し分ける再発を捕まえる。renderToStaticMarkup は App Router の文脈を持たないので、
 * next/script の strategy 差（beforeInteractive 等、App Router でだけ HTML を出す経路）までは見ない。
 */
describe("RootLayout の HTML は解析系の実行時 env に依存しない", () => {
	const saved = Object.fromEntries(ANALYTICS_ENV.map((k) => [k, process.env[k]]));

	afterEach(() => {
		for (const k of ANALYTICS_ENV) {
			if (saved[k] === undefined) delete process.env[k];
			else process.env[k] = saved[k];
		}
	});

	it("env 未定義（ビルド時相当）と env あり（実行時相当）で同じ HTML を出す", async () => {
		for (const k of ANALYTICS_ENV) delete process.env[k];
		const buildTimeHtml = await renderLayoutHtml();

		process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = "G-TEST123";
		process.env.NEXT_PUBLIC_GTM_ID = "GTM-TEST123";
		const runtimeHtml = await renderLayoutHtml();

		expect(runtimeHtml).not.toContain("GTM-TEST123");
		expect(runtimeHtml).not.toContain("G-TEST123");
		expect(runtimeHtml).toBe(buildTimeHtml);
	});
});
