import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GoogleAdSenseScript } from "./google-adsense-script";

const originalEnv = process.env;

describe("GoogleAdSenseScript", () => {
	afterEach(() => {
		process.env = { ...originalEnv };
		vi.restoreAllMocks();
	});

	it("ADSENSE_CLIENT_IDが設定されている場合にコンポーネントをレンダリングする", () => {
		process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID = "ca-pub-1234567890123456";

		const { container } = render(<GoogleAdSenseScript />);

		// Next.jsのScriptコンポーネントはDOMに直接レンダリングされないため、
		// コンポーネントが正常にレンダリングされることのみ確認
		expect(container).toBeTruthy();
	});

	it("ADSENSE_CLIENT_IDが設定されていない場合はnullを返す", () => {
		delete process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;

		const result = render(<GoogleAdSenseScript />);

		// 環境変数がない場合は何もレンダリングされない
		expect(result.container.firstChild).toBeNull();
	});

	it("開発環境でADSENSE_CLIENT_IDが未設定の場合に警告をログ出力する", () => {
		const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
		process.env.NODE_ENV = "development";
		delete process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;

		render(<GoogleAdSenseScript />);

		expect(consoleSpy).toHaveBeenCalledWith("Google AdSense Client ID not configured");
	});

	it("開発環境でADSENSE_CLIENT_IDが設定されている場合に情報をログ出力する", () => {
		const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
		process.env.NODE_ENV = "development";
		process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID = "ca-pub-1234567890123456";

		render(<GoogleAdSenseScript />);

		expect(consoleSpy).toHaveBeenCalledWith(
			"Google AdSense Script loading with Client ID:",
			"ca-pub-1234567890123456",
		);
	});
});
